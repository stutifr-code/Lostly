/* ---------- Report form (lost / found poster) ---------- */
function formView(t) {
  const lost = t === "lost";

  return `<div class="posterwrap"><button class="back" data-go="home">← Back</button><div class="poster ${t}"><div class="holes">${"<i></i>".repeat(12)}</div>
  <div class="ribbon">${lost ? "MISSING" : "FOUND"}</div><p class="ptag">${lost ? "Have you seen this item?" : "Is this yours? Claim it!"}</p>
  <div class="polaroid" id="drop"><span class="tape t1"></span><span class="tape t2"></span><div id="prev">📷 Tap to add a photo ${REQ}</div></div><input type="file" id="file" accept="image/*" class="hide">
  <div class="bub"><label for="nm">Item name ${REQ}</label><input type="text" id="nm" maxlength="60"></div>
  <div class="bub"><label for="dt">${lost ? "Last seen on" : "Found on"} ${REQ}</label><input type="date" id="dt" max="${today()}" value="${today()}"></div>
  <div class="bub"><label for="pl">${lost ? "Approximate location" : "Found at"} ${REQ}</label><input type="text" id="pl" maxlength="80" placeholder="e.g. Library, Block B"></div>
  ${lost ? "" : `<div class="bub"><label for="qq">Verification question for the owner ${REQ}</label><input type="text" id="qq" maxlength="100" placeholder="e.g. What sticker is on the back?"></div>`}
  <p class="safe">🔒 Don't show ID numbers, phone numbers or faces in the photo.</p>
  <p class="hint" style="text-align:center;margin:6px 0 0"><i class="req">*</i> Required field</p><div class="err" id="err" style="text-align:center"></div>
  <button class="confirm ${t}" id="sub">Confirm</button></div></div>`;
}

/* Shrinks the chosen photo to at most 480px and shows a preview */
function handleImageFile(file) {
  const reader = new FileReader();

  reader.onload = () => {
    const im = new Image();

    im.onload = () => {
      const scale = Math.min(1, 480 / Math.max(im.width, im.height));
      const canvas = document.createElement("canvas");
      canvas.width = im.width * scale;
      canvas.height = im.height * scale;
      canvas.getContext("2d").drawImage(im, 0, 0, canvas.width, canvas.height);

      imgData = canvas.toDataURL("image/jpeg", .7);
      $("#prev").innerHTML = `<img src="${imgData}" alt="Preview">`;
    };

    im.src = reader.result;
  };

  reader.readAsDataURL(file);
}
