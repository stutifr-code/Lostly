/* ---------- Supabase operations ---------- */

/* Converts a Supabase message row into the shape the UI uses */
const cloudMsg = (m, threadId, item, asker) => ({
  id: m.id,
  thread: threadId,
  item,
  asker,
  senderId: m.sender_id,
  from: m.sender_id === authUserId ? session.email : "student",
  text: m.body,
  t: new Date(m.created_at).getTime(),
  cloud: true
});

async function loadCloudItems() {
  const { data, error } = await supabaseClient
    .from("items")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Could not load items:", error);
    toast("Could not load database items.");
    return;
  }

  const entries = await Promise.all((data || []).map(async row => {
    let imageUrl = "";

    if (row.image_url) {
      const { data: signed } = await supabaseClient.storage.from(PHOTO_BUCKET).createSignedUrl(row.image_url, 3600);
      imageUrl = signed?.signedUrl || "";
    }

    return [
      row.id,
      {
        id: row.id,
        type: row.item_type,
        name: row.title,
        date: row.item_date,
        place: row.location,
        img: imageUrl,
        imagePath: row.image_url || "",
        by: row.user_id === authUserId ? session.email : "student",
        ownerId: row.user_id,
        status: row.status || "open",
        t: new Date(row.created_at).getTime(),
        q: row.verification_question || "",
        emo: "📦"
      }
    ];
  }));

  cache.items = Object.fromEntries(entries);
}

async function loadCloudConversations() {
  const { data: conversations, error } = await supabaseClient.from("conversations").select("*");
  if (error) throw error;

  cache.conversations = Object.fromEntries((conversations || []).map(c => [c.id, c]));

  // Student messaging is cloud-only; discard seeded/local demo messages.
  cache.msgs = {};

  const ids = (conversations || []).map(c => c.id);
  if (!ids.length) return;

  const { data: messages, error: messageError } = await supabaseClient
    .from("messages")
    .select("*")
    .in("conversation_id", ids)
    .order("created_at", { ascending: true });

  if (messageError) throw messageError;

  (messages || []).forEach(m => {
    const c = cache.conversations[m.conversation_id];
    if (!c) return;
    cache.msgs[m.id] = cloudMsg(m, c.id, c.item_id, peerOf(c));
  });
}

async function loadConversationMessages(conversationId) {
  if (!conversationId) return;

  const { data, error } = await supabaseClient
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (error) throw error;

  const conversation = cache.conversations[conversationId];
  const peerId = conversation ? peerOf(conversation) : "";

  Object.keys(cache.msgs).forEach(key => {
    if (cache.msgs[key]?.thread === conversationId) delete cache.msgs[key];
  });

  (data || []).forEach(m => {
    cache.msgs[m.id] = cloudMsg(m, conversationId, conversation?.item_id || openId, peerId);
  });
}

async function getOrCreateConversation(item) {
  if (!authUserId || !item || !item.ownerId) {
    throw new Error("Unable to identify the students in this conversation.");
  }
  if (item.ownerId === authUserId) {
    throw new Error("You cannot start a conversation with yourself.");
  }

  const { data: existing, error: findError } = await supabaseClient
    .from("conversations")
    .select("*")
    .eq("item_id", item.id);

  if (findError) throw findError;

  const match = (existing || []).find(c =>
    (c.participant_one === authUserId && c.participant_two === item.ownerId) ||
    (c.participant_one === item.ownerId && c.participant_two === authUserId)
  );
  if (match) return match;

  const { data, error } = await supabaseClient
    .from("conversations")
    .insert({ item_id: item.id, participant_one: authUserId, participant_two: item.ownerId })
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function updateCloudItemStatus(item, nextStatus) {
  if (!authUserId || !item || item.ownerId !== authUserId) {
    throw new Error("Only the owner of this post can change its status.");
  }

  const { data, error } = await supabaseClient
    .from("items")
    .update({ status: nextStatus })
    .eq("id", item.id)
    .eq("user_id", authUserId)
    .select("id,status")
    .single();

  if (error) throw error;
  if (!data) throw new Error("The post was not updated. Please refresh and try again.");

  await loadCloudItems();
}

async function deleteCloudItem(item) {
  if (!authUserId || !item || item.ownerId !== authUserId) {
    throw new Error("Only the owner of this post can delete it.");
  }

  const { data, error } = await supabaseClient
    .from("items")
    .delete()
    .eq("id", item.id)
    .eq("user_id", authUserId)
    .select("id")
    .single();

  if (error) throw error;
  if (!data) throw new Error("The post was not deleted. Please refresh and try again.");

  if (item.imagePath) {
    const { error: photoError } = await supabaseClient.storage.from(PHOTO_BUCKET).remove([item.imagePath]);
    if (photoError) console.warn("Post deleted, but its photo could not be removed:", photoError);
  }

  await loadCloudItems();
  await loadCloudConversations();
}

async function submitCloudReport(item, reportType, reason) {
  if (!authUserId || !item) throw new Error("Please sign in again before reporting.");

  let reportedUserId = item.ownerId || null;
  if (reportType === "chat") {
    const c = cache.conversations[activeConversationId];
    reportedUserId = c ? peerOf(c) : null;
  }

  const { error } = await supabaseClient.from("reports").insert({
    reporter_id: authUserId,
    item_id: reportType === "post" ? item.id : null,
    conversation_id: reportType === "chat" ? activeConversationId : null,
    reported_user_id: reportedUserId,
    reason: reason.slice(0, 200),
    status: "open"
  });

  if (error) throw error;
}
