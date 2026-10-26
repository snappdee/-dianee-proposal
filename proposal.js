const token = location.pathname.split("/").filter(Boolean).pop();
const background = document.getElementById("proposalBackground");
const greeting = document.getElementById("greeting");
const headline = document.getElementById("headline");
const message = document.getElementById("message");
const signature = document.getElementById("signatureName");
const revealButton = document.getElementById("revealButton");
const questionArea = document.getElementById("questionArea");
const resultArea = document.getElementById("resultArea");
const yesButton = document.getElementById("yesButton");
const noButton = document.getElementById("noButton");
let proposal = null;

function safeText(value) { return String(value || "").replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c])); }

async function loadProposal() {
  try {
    const response = await fetch(`/api/proposals/${encodeURIComponent(token)}`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "This link isn't available.");
    proposal = data;
    document.title = `A little question for ${data.partnerName} 💗`;
    greeting.textContent = `${data.proposerName} made this just for you`;
    headline.innerHTML = `Dear <em>${safeText(data.partnerName)},</em>`;
    message.textContent = data.message || "If I could choose a thousand times, I would still choose you. You make ordinary days feel special, and imagining my future is sweeter because you're in it.";
    signature.textContent = data.proposerName;
    if (data.background) {
      background.style.backgroundImage = `url("${data.background.replace(/["\\]/g, "")}")`;
      background.classList.add("has-photo");
    }
    if (data.response) {
      showAlreadyAnswered(data.response.answer);
    }
  } catch (error) {
    headline.textContent = "A little mystery…";
    message.textContent = error.message;
    revealButton.hidden = true;
    greeting.textContent = "This page could not be opened";
  }
}
function showAlreadyAnswered(answer) {
  revealButton.hidden = true;
  questionArea.hidden = true;
  resultArea.hidden = false;
  resultArea.innerHTML = answer === "yes"
    ? `<div class="heart-burst">♥ ♥ ♥</div><h2>Love answered 💍</h2><p>An answer has already been sent. Keep this moment close to your heart.</p>`
    : `<h2>Thank you for being honest.</h2><p>An answer has already been sent. Your choice deserves respect.</p>`;
}
revealButton.addEventListener("click", () => {
  revealButton.hidden = true;
  questionArea.hidden = false;
  questionArea.scrollIntoView({ behavior: "smooth", block: "nearest" });
});
async function submitAnswer(answer) {
  yesButton.disabled = true;
  noButton.disabled = true;
  try {
    const response = await fetch(`/api/proposals/${encodeURIComponent(token)}/response`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ answer })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Your answer could not be sent. Please try again.");
    questionArea.hidden = true;
    resultArea.hidden = false;
    resultArea.innerHTML = answer === "yes"
      ? `<div class="heart-burst">♥ ♥ ♥</div><h2>You just made a heart very happy. 💍</h2><p>Your answer has been sent. Here's to the beautiful story you're choosing to write together.</p>`
      : `<h2>Thank you for being honest.</h2><p>Your answer has been sent. You deserve to make the choice that feels right for you.</p>`;
    resultArea.scrollIntoView({ behavior: "smooth", block: "nearest" });
  } catch (error) {
    const p = document.createElement("p");
    p.textContent = error.message;
    p.style.color = "#b4233c";
    resultArea.hidden = false;
    resultArea.replaceChildren(p);
    yesButton.disabled = false;
    noButton.disabled = false;
  }
}
yesButton.addEventListener("click", () => submitAnswer("yes"));
noButton.addEventListener("click", () => submitAnswer("no"));
loadProposal();