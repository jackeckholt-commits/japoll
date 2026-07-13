const DOG_LINES = [
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
  },
  {
    text: "The Senate has a real candy desk. Its senator is responsible for keeping the drawer stocked with sweets.",
    sourceLabel: "U.S. Senate Historian",
    sourceUrl: "https://www.senate.gov/art-artifacts/decorative-art/furniture/senate-chamber-desks/candy-desk.htm"
  },
  {
    text: "Bean soup has been served in Senate restaurants every day for more than a century.",
    sourceLabel: "U.S. Senate Historian",
    sourceUrl: "https://www.senate.gov/about/traditions-symbols/senate-bean-soup.htm"
  },
  {
    text: "Senator Wayne Morse once put his chair in the middle of the aisle to show he was independent.",
    sourceLabel: "U.S. Senate Historian",
    sourceUrl: "https://www.senate.gov/art-artifacts/decorative-art/furniture/senate-chamber-desks/traditions.htm"
  },
  {
    text: "'Tippecanoe and Tyler Too' was both an 1840 campaign song and its catchy slogan.",
    sourceLabel: "Library of Congress",
    sourceUrl: "https://www.loc.gov/exhibits/presidential-songs/issues-and-slogans.html"
  },
  {
    text: "An 1884 chant rhymed 'James G. Blaine' with 'continental liar from the state of Maine.'",
    sourceLabel: "Library of Congress",
    sourceUrl: "https://blogs.loc.gov/folklife/2016/11/election-week-special-the-dodger-and-the-election-of-1884/"
  },
  {
    text: "An 1884 anti-Cleveland chant asked, 'Ma, ma, where's my pa?' Subtle it was not.",
    sourceLabel: "Library of Congress",
    sourceUrl: "https://blogs.loc.gov/folklife/2016/11/election-week-special-the-dodger-and-the-election-of-1884/"
  },
  {
    text: "The House mace has 13 ebony rods for the original states, plus a silver globe topped by a bald eagle.",
    sourceLabel: "U.S. House Historian",
    sourceUrl: "https://history.house.gov/Blog/Detail/15032450168"
  },
  {
    text: "House members once chose their individual Chamber desks by lottery at the start of each Congress.",
    sourceLabel: "U.S. House Historian",
    sourceUrl: "https://history.house.gov/Exhibitions-and-Publications/Page-History/Historical-Essays/Traditions/"
  },
  {
    text: "Thirty of the first 44 presidents had a dog in office. Dog the cat remains unconvinced.",
    sourceLabel: "White House Historical Association",
    sourceUrl: "https://www.whitehousehistory.org/presidential-pooches"
  },
  {
    text: "Franklin Roosevelt joked that attacks did not bother his family, but his dog Fala 'does resent them.'",
    sourceLabel: "White House Historical Association",
    sourceUrl: "https://www.whitehousehistory.org/presidential-pooches"
  },
  {
    text: "A guest bet she could make Calvin Coolidge say more than two words. His reply: 'You lose.'",
    sourceLabel: "Archived White House",
    sourceUrl: "https://clintonwhitehouse3.archives.gov/WH/glimpse/presidents/html/cc30.html"
  },
  {
    text: "The phrase 'Electoral College' is not in the Constitution. It refers only to 'electors.'",
    sourceLabel: "National Archives",
    sourceUrl: "https://www.archives.gov/electoral-college/history"
  },
  {
    text: "In 1836, the Senate had to decide the vice-presidential election.",
    sourceLabel: "National Archives",
    sourceUrl: "https://www.archives.gov/electoral-college/history"
  },
  {
    text: "A rooster crashed a 1973 inaugural ball. It was not on the guest list.",
    sourceLabel: "Smithsonian",
    sourceUrl: "https://www.smithsonianmag.com/smithsonian-institution/that-time-a-chicken-crashed-nixons-inaugural-ball-and-other-crazy-inaugural-tales-2481504/"
  },
  {
    text: "July 4 is presidentially crowded: three presidents died on it, and one was born.",
    sourceLabel: "White House Historical Association",
    sourceUrl: "https://www.whitehousehistory.org/questions/what-are-some-interesting-facts-about-presidents-first-ladies"
  },
  {
    text: "Campaign merchandise has included macaroni and cheese. Democracy can be shelf-stable.",
    sourceLabel: "Smithsonian",
    sourceUrl: "https://www.smithsonianmag.com/smithsonian-institution/ten-artifacts-smithsonian-tell-us-crazy-history-american-politics-180958176/"
  },
  {
    text: "Irving Berlin wrote Eisenhower a campaign song. Politics once came with show tunes.",
    sourceLabel: "Smithsonian",
    sourceUrl: "https://www.smithsonianmag.com/smithsonian-institution/ten-artifacts-smithsonian-tell-us-crazy-history-american-politics-180958176/"
  },
  {
    text: "William Henry Harrison's inaugural address ran 8,445 words. Dog prefers bullet points.",
    sourceLabel: "History",
    sourceUrl: "https://www.history.com/articles/10-unexpected-moments-presidential-inauguration-history"
  },
  {
    text: "George Washington won the first presidential election with 69 electoral votes. Tiny map.",
    sourceLabel: "Smithsonian",
    sourceUrl: "https://www.smithsonianmag.com/smithsonian-institution/ten-artifacts-smithsonian-tell-us-crazy-history-american-politics-180958176/"
  },
  {
    text: "Nearly every president from Lincoln through Taft had facial hair. Peak whisker politics.",
    sourceLabel: "White House Historical Association",
    sourceUrl: "https://www.whitehousehistory.org/questions/what-are-some-interesting-facts-about-presidents-first-ladies"
  },
  {
    text: "The Senate has a candy desk. Some legislation is sweeter than others.",
    sourceLabel: "U.S. Senate Historian",
    sourceUrl: "https://www.senate.gov/art-artifacts/decorative-art/furniture/senate-chamber-desks/candy-desk.htm"
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
  speech.append(speechTop, message);

  const mascot = document.createElement("button");
  mascot.className = "dog-mascot-button";
  mascot.type = "button";
  mascot.setAttribute("aria-controls", speech.id);
  mascot.setAttribute("aria-expanded", "true");
  mascot.setAttribute("aria-label", "Hear another election fact from Dog");
  const image = document.createElement("img");
  image.src = "assets/dog-mascot.png";
  image.alt = "";
  image.width = 96;
  image.height = 96;
  mascot.append(image);
  widget.append(speech, mascot);
  const content = document.querySelector("#main-content") || document.querySelector("main");
  if (content) {
    const stage = document.createElement("div");
    stage.className = "dog-stage container";
    stage.appendChild(widget);
    content.before(stage);
  } else {
    document.body.appendChild(widget);
  }

  function showLine() {
    const line = pickDogLine();
    message.textContent = line.text;
    speech.hidden = false;
    widget.classList.remove("is-collapsed");
    mascot.setAttribute("aria-expanded", "true");
    sessionStorage.removeItem("japollDogHidden");
  }

  function hideSpeech() {
    speech.hidden = true;
    widget.classList.add("is-collapsed");
    mascot.setAttribute("aria-expanded", "false");
    sessionStorage.setItem("japollDogHidden", "true");
  }

  close.addEventListener("click", hideSpeech);
  mascot.addEventListener("click", showLine);

  showLine();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", createDogMascot, { once: true });
} else {
  createDogMascot();
}
