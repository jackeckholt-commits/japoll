const DOG_LINES = [
  {
    text: "Hi, I’m Dog, Japoll’s election-fact mascot.",
    intro: true
  },
  {
    text: "My name is Dog. Tap me whenever you want another sourced election fact.",
    intro: true
  },
  {
    text: "Dog here. I brought you another election fact.",
    intro: true
  },
  {
    text: "The Electoral College is a process, not a place. It has 538 electors, and 270 votes elect a president.",
    sourceLabel: "National Archives",
    sourceUrl: "https://www.archives.gov/electoral-college/about"
  },
  {
    text: "Washington, D.C. gets three electoral votes under the 23rd Amendment.",
    sourceLabel: "National Archives",
    sourceUrl: "https://www.archives.gov/electoral-college/about"
  },
  {
    text: "Jeannette Rankin was elected to Congress in 1916—four years before the 19th Amendment guaranteed women the vote nationwide.",
    sourceLabel: "U.S. House Historian",
    sourceUrl: "https://history.house.gov/Education/Fact-Sheets/WIC-Fact-Sheet2/"
  },
  {
    text: "The vice president can vote in the Senate only to break a tie.",
    sourceLabel: "U.S. Senate",
    sourceUrl: "https://www.senate.gov/about/officers-staff/vice-president.htm"
  },
  {
    text: "NASA astronaut David Wolf became the first American to vote from space in 1997.",
    sourceLabel: "NASA",
    sourceUrl: "https://www.nasa.gov/general/how-nasa-astronauts-vote-from-space-aboard-international-space-station/"
  },
  {
    text: "Votes sent from space are encrypted so only the astronaut and the election clerk can open them.",
    sourceLabel: "NASA",
    sourceUrl: "https://www.nasa.gov/general/how-nasa-astronauts-vote-from-space-aboard-international-space-station/"
  },
  {
    text: "Only two presidential elections—1800 and 1824—have been decided by the House of Representatives.",
    sourceLabel: "U.S. House Historian",
    sourceUrl: "https://history.house.gov/Institution/Electoral-College/Electoral-College/"
  },
  {
    text: "Rutherford B. Hayes won the disputed 1876 presidential election by a single electoral vote.",
    sourceLabel: "U.S. House Historian",
    sourceUrl: "https://history.house.gov/Institution/Electoral-College/Electoral-College/"
  },
  {
    text: "The longest individual Senate speech lasted 25 hours and 5 minutes, delivered by Cory Booker in April 2025.",
    sourceLabel: "U.S. Senate Historian",
    sourceUrl: "https://www.senate.gov/about/powers-procedures/filibusters-cloture/overview.htm"
  },
  {
    text: "Jeannette Rankin was the only member of Congress to vote against U.S. entry into both world wars.",
    sourceLabel: "U.S. House Historian",
    sourceUrl: "https://history.house.gov/Historical-Highlights/1901-1950/The-swearing-in-of-the-first-woman-elected-to-Congress%2C-Representative-Jeannette-Rankin-of-Montana/"
  }
];

function pickDogLine() {
  const previous = Number(sessionStorage.getItem("japollDogLine"));
  const choices = DOG_LINES.map((_, index) => index).filter(index => index !== previous);
  const index = choices[Math.floor(Math.random() * choices.length)];
  sessionStorage.setItem("japollDogLine", String(index));
  return DOG_LINES[index];
}

function createDogMascot() {
  if (document.querySelector("[data-dog-widget]")) return;

  document.body.classList.add("dog-is-here");

  const widget = document.createElement("aside");
  widget.className = "dog-widget";
  widget.dataset.dogWidget = "";
  widget.setAttribute("aria-label", "Dog, Japoll’s election fact mascot");

  const speech = document.createElement("section");
  speech.className = "dog-speech";
  speech.id = "dog-speech";
  speech.setAttribute("aria-live", "polite");

  const speechTop = document.createElement("div");
  speechTop.className = "dog-speech-top";
  const name = document.createElement("strong");
  name.textContent = "Dog says";
  const close = document.createElement("button");
  close.className = "dog-close";
  close.type = "button";
  close.setAttribute("aria-label", "Hide Dog’s message");
  close.textContent = "×";
  speechTop.append(name, close);

  const message = document.createElement("p");
  message.className = "dog-message";

  const speechActions = document.createElement("div");
  speechActions.className = "dog-speech-actions";
  const source = document.createElement("a");
  source.className = "dog-source";
  source.target = "_blank";
  source.rel = "noopener noreferrer";
  const another = document.createElement("button");
  another.className = "dog-another";
  another.type = "button";
  another.textContent = "Another fact";
  speechActions.append(source, another);
  speech.append(speechTop, message, speechActions);

  const mascot = document.createElement("button");
  mascot.className = "dog-mascot-button";
  mascot.type = "button";
  mascot.setAttribute("aria-controls", speech.id);
  mascot.setAttribute("aria-expanded", "true");
  mascot.setAttribute("aria-label", "Ask Dog for another election fact");
  const image = document.createElement("img");
  image.src = "assets/dog-mascot.png";
  image.alt = "";
  image.width = 96;
  image.height = 96;
  const badge = document.createElement("span");
  badge.textContent = "DOG";
  mascot.append(image, badge);
  widget.append(speech, mascot);
  const content = document.querySelector("#main-content") || document.querySelector("main");
  if (content) {
    content.prepend(widget);
  } else {
    document.body.appendChild(widget);
  }

  function showLine() {
    const line = pickDogLine();
    message.textContent = line.text;
    source.hidden = !line.sourceUrl;
    if (line.sourceUrl) {
      source.href = line.sourceUrl;
      source.textContent = `Source: ${line.sourceLabel}`;
    }
    speech.hidden = false;
    mascot.setAttribute("aria-expanded", "true");
    sessionStorage.removeItem("japollDogHidden");
  }

  function hideSpeech() {
    speech.hidden = true;
    mascot.setAttribute("aria-expanded", "false");
    sessionStorage.setItem("japollDogHidden", "true");
  }

  close.addEventListener("click", hideSpeech);
  another.addEventListener("click", showLine);
  mascot.addEventListener("click", showLine);

  const startHidden = sessionStorage.getItem("japollDogHidden") === "true";
  showLine();
  if (startHidden) hideSpeech();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", createDogMascot, { once: true });
} else {
  createDogMascot();
}
