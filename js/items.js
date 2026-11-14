/* ---------- Posting and item actions ---------- */
async function submitPost() {
  const name = $("#nm").value.trim();
  const date = $("#dt").value;
  const place = $("#pl").value.trim();
  const question = $("#qq") ? $("#qq").value.trim() : "";

  if (!authUserId) return fail("Please sign in again.");
  if (isBlocked(session.email)) return fail("Your account has been restricted by an admin.");
  if (!imgData || !name || !date || !place || (view === "found" && !question)) {
    return fail("Please fill every field marked * (including the photo).");
  }

  const btn = $("#sub");
  setBusy(btn, true, "Posting...");

  try {
    const imagePath = `${authUserId}/${crypto.randomUUID()}.jpg`;
    const imageBlob = await (await fetch(imgData)).blob();

    const { error: uploadError } = await supabaseClient.storage
      .from(PHOTO_BUCKET)
      .upload(imagePath, imageBlob, { contentType: "image/jpeg", upsert: false });

    if (uploadError) throw uploadError;

    const { error: insertError } = await supabaseClient.from("items").insert({
      user_id: authUserId,
      title: name,
      description: null,
      category: null,
      location: place,
      item_type: view,
      image_url: imagePath,
      status: "open",
      item_date: date,
      verification_question: question || null
    });

    if (insertError) {
      await supabaseClient.storage.from(PHOTO_BUCKET).remove([imagePath]);
      throw insertError;
    }

    await loadCloudItems();

    imgData = "";
    filter = FRESH();
    toast("Posted! Thank you 🎉");
    go("db");
  } catch (error) {
    console.error("Posting failed:", error);
    fail(error.message || "Could not post your item.");
  } finally {
    setBusy(btn, false, "Post item");
  }
}

/* Handles the owner buttons (return / delete) and the report links on the item page */
async function itemAction(btn) {
  const it = cache.items[openId];
  const action = btn.dataset.act;
  if (!it) return;

  if (action === "ret") {
    const nextStatus = it.status === "returned" ? "open" : "returned";
    btn.disabled = true;
    try {
      await updateCloudItemStatus(it, nextStatus);
      toast(nextStatus === "returned" ? "Marked as returned 🎉" : "Post reopened.");
      render();
    } catch (error) {
      btn.disabled = false;
      toast(error.message || "Could not update the post.");
    }
    return;
  }

  if (action === "del") {
    if (!confirm("Delete your report permanently?")) return;
    btn.disabled = true;
    try {
      await deleteCloudItem(it);
      toast("Report deleted.");
      closeChat();
      go("db");
    } catch (error) {
      btn.disabled = false;
      toast(error.message || "Could not delete the report.");
    }
    return;
  }

  if (action === "flag" || action === "flagchat") {
    const reason = prompt("Why are you reporting this? (spam, inappropriate, private info, other)");
    if (!reason || !reason.trim()) return;
    btn.disabled = true;
    try {
      await submitCloudReport(it, action === "flagchat" ? "chat" : "post", reason.trim());
      toast("Report submitted. Thank you.");
    } catch (error) {
      btn.disabled = false;
      toast(error.message || "Could not submit the report.");
    }
  }
}
