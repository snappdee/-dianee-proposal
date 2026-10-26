const form = document.getElementById("proposalForm");
const statusBox = document.getElementById("status");
const fileInput = document.getElementById("background");
const preview = document.getElementById("imagePreview");
const previewImg = preview.querySelector("img");
const successPanel = document.getElementById("successPanel");
let previewUrl = null;

fileInput.addEventListener("change", () => {
  const file = fileInput.files[0];
  if (previewUrl) URL.revokeObjectURL(previewUrl);
  if (!file) { preview.hidden = true; return; }
  if (file.size > 5 * 1024 * 1024) {
    statusBox.textContent = "That image is larger than 5 MB. Please choose a smaller one.";
    statusBox.className = "status error";
    fileInput.value = "";
    preview.hidden = true;
    return;
  }
  previewUrl = URL.createObjectURL(file);
  previewImg.src = previewUrl;
  preview.hidden = false;
  statusBox.textContent = "";
  statusBox.className = "status";
});
document.getElementById("removeImage").addEventListener("click", () => {
  fileInput.value = "";
  preview.hidden = true;
  if (previewUrl) URL.revokeObjectURL(previewUrl);
  previewUrl = null;
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  statusBox.textContent = "Preparing your little surprise…";
  statusBox.className = "status";
  successPanel.hidden = true;
  const button = form.querySelector(".submit-button");
  button.disabled = true;
  const oldText = button.querySelector("span").textContent;
  button.querySelector("span").textContent = "Sending…";
  try {
    const response = await fetch("/api/proposals", { method: "POST", body: new FormData(form) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Something went wrong.");
    document.getElementById("shareLink").value = result.link;
    successPanel.hidden = false;
    statusBox.textContent = "Your proposal link is ready! Copy it and send it to Dianee.";
    statusBox.className = "status";
    successPanel.scrollIntoView({ behavior: "smooth", block: "nearest" });
  } catch (error) {
    statusBox.textContent = error.message;
    statusBox.className = "status error";
  } finally {
    button.disabled = false;
    button.querySelector("span").textContent = oldText;
  }
});

document.getElementById("copyLink").addEventListener("click", async () => {
  const input = document.getElementById("shareLink");
  try {
    await navigator.clipboard.writeText(input.value);
    document.getElementById("copyLink").textContent = "Copied ✓";
  } catch {
    input.select();
    document.execCommand("copy");
    document.getElementById("copyLink").textContent = "Copied ✓";
  }
});
