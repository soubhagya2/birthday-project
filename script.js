/* =====================================================
   CONFIG (SINGLE SOURCE OF TRUTH)
===================================================== */
const CLOUD_NAME = "dgqvkksup";
const IMAGE_UPLOAD_PRESET = "birthday_unsigned";
const VIDEO_UPLOAD_PRESET = "birthday_video_unsigned";

// This is the most important change for deployment.
const API_BASE_URL = "https://snigdha-birthday-server.onrender.com/api";

// This key MUST match the SECRET_KEY on your Render server.
const SECRET_KEY = "your-super-secret-key";

/* =====================================================
   DOM REFERENCES
===================================================== */
const imageInput = document.getElementById("imageUpload");
const videoInput = document.getElementById("videoUpload");
const imageGallery = document.getElementById("imageGallery");
const videoGallery = document.getElementById("videoGallery");
const sections = document.querySelectorAll(".step-section");

/* =====================================================
   STATE
===================================================== */
let currentStep = 0;
let finalPageInterval = null;
let countdownInterval = null;

/* =====================================================
   CLOUDINARY TRANSFORMS
===================================================== */
function cloudinaryImage(url) {
  return url.replace("/upload/", "/upload/f_auto,q_auto,w_auto,c_limit/");
}

function cloudinaryVideo(url) {
  return url.replace("/upload/", "/upload/f_auto,q_auto/");
}

/* =====================================================
   CLOUDINARY UPLOADS
===================================================== */
async function uploadImage(file) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", IMAGE_UPLOAD_PRESET);
  formData.append("folder", "birthday-memories");

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    { method: "POST", body: formData }
  );

  if (!res.ok) throw new Error("Image upload failed");
  return (await res.json()).secure_url;
}

async function uploadVideo(file) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", VIDEO_UPLOAD_PRESET);
  formData.append("folder", "birthday-memories/videos");

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/video/upload`,
    { method: "POST", body: formData }
  );

  if (!res.ok) throw new Error("Video upload failed");
  return (await res.json()).secure_url;
}

/* =====================================================
   API INTERACTION
===================================================== */

async function loadInitialMedia() {
  try {
    const res = await fetch(`${API_BASE_URL}/media`);
    if (!res.ok) throw new Error("Failed to fetch media");
    const { images, videos } = await res.json();

    imageGallery.innerHTML = "";
    videoGallery.innerHTML = ""; // Clear placeholders

    images.forEach((url) => createMediaElement(url, "image", imageGallery));
    videos.forEach((url) => createMediaElement(url, "video", videoGallery));
  } catch (error) {
    console.error("Error loading initial media:", error);
    showToast("Could not load saved memories", "error");
  }
}

async function saveMediaToDB(url, type) {
  try {
    const res = await fetch(`${API_BASE_URL}/media`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-secret-key": SECRET_KEY, // Add the secret key header
      },
      body: JSON.stringify({ url, type }),
    });
    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.message || "Failed to save media to DB");
    }
  } catch (error) {
    console.error(error);
    showToast(`Failed to save memory: ${error.message}`, "error");
  }
}

async function deleteMediaFromDB(url, type) {
  const res = await fetch(`${API_BASE_URL}/media`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      "x-secret-key": SECRET_KEY, // Add the secret key header
    },
    body: JSON.stringify({ url, type }),
  });
  return res.ok;
}

/* =====================================================
   MEDIA CREATION
===================================================== */
// A collection of cute captions for the memory cards
const memoryCaptions = [
  "A Cherished Moment",
  "My Favorite Smile",
  "Our Happy Place",
  "Forever in my Heart",
  "So Much Love",
  "Pure Happiness",
  "Unforgettable Times",
  "My World in a Picture",
  "Love this so much!",
  "Best day ever.",
  "Adventures with you.",
  "Just the two of us.",
  "Making memories.",
  "Couldn't be happier.",
  "A day to remember.",
  "My sunshine.",
  "Every moment matters.",
  "The best of times.",
  "My dream come true.",
  "This is everything.",
];

function createMediaElement(url, type, gallery) {
  const item = document.createElement("div");
  item.className =
    "media-item group transform transition-transform duration-300";
  item.dataset.url = url;
  item.dataset.type = type;

  const rotation = Math.random() * 8 - 4;
  item.style.transform = `rotate(${rotation}deg)`;

  let mediaHTML = "";
  if (type === "image") {
    mediaHTML = `<img src="${cloudinaryImage(
      url
    )}" loading="lazy" class="w-full h-full object-cover" alt="User Memory" />`;
  } else {
    mediaHTML = `
      <video controls playsinline webkit-playsinline preload="metadata" class="w-full h-full object-cover">
        <source src="${cloudinaryVideo(url)}" type="video/mp4" />
        Your browser does not support the video tag.
      </video>
    `;
  }

  let captionHTML = "";
  let bottomPaddingClass = "pb-2";

  if (type === "image") {
    const caption =
      memoryCaptions[Math.floor(Math.random() * memoryCaptions.length)];
    captionHTML = `<div class="absolute bottom-2 left-2 right-2 text-center font-cursive text-pink-500 text-base px-1">${caption}</div>`;
    bottomPaddingClass = "pb-8";
  }

  item.innerHTML = `
    <div class="bg-white p-2 ${bottomPaddingClass} rounded-lg shadow-xl border-2 border-gray-100 relative">
      <div class="aspect-square overflow-hidden rounded-md">
        ${mediaHTML}
      </div>
      ${captionHTML}
      <button onclick="deleteMedia(this)"
        class="delete-btn absolute -top-3 -right-3 bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-lg font-bold shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-20">
        &times;
      </button>
    </div>
  `;

  gallery.prepend(item);
}

async function deleteMedia(btn) {
  const mediaItem = btn.closest(".media-item");
  const url = mediaItem.dataset.url;
  const type = mediaItem.dataset.type;

  if (
    !confirm(
      `Are you sure you want to delete this ${type}? This action cannot be undone.`
    )
  )
    return;

  if (!url || !type) {
    showToast("Cannot delete: media info missing.", "error");
    return;
  }

  const success = await deleteMediaFromDB(url, type);

  if (success) {
    mediaItem.remove();
    showToast("Memory deleted!");
  } else {
    showToast("Failed to delete memory. Check permissions.", "error");
  }
}

/* =====================================================
   FILE HANDLING
===================================================== */
async function handleUpload(files, type) {
  const gallery = type === "image" ? imageGallery : videoGallery;
  for (const file of files) {
    try {
      let url;
      if (type === "image") {
        if (file.size > 5 * 1024 * 1024) {
          showToast("Image must be under 5MB", "error");
          continue;
        }
        showToast("Uploading image...");
        url = await uploadImage(file);
        showToast("Image uploaded!");
      } else {
        // video
        if (file.size > 100 * 1024 * 1024) {
          showToast("Video must be under 100MB", "error");
          continue;
        }
        showToast("Uploading video...");
        url = await uploadVideo(file);
        showToast("Video uploaded!");
      }
      createMediaElement(url, type, gallery);
      await saveMediaToDB(url, type);
    } catch (err) {
      console.error(err);
      showToast(`Upload failed: ${err.message}`, "error");
    }
  }
}

/* =====================================================
   STEPS / NAVIGATION
===================================================== */
function changeStep(dir) {
  if (sections[currentStep]) {
    sections[currentStep].classList.remove("active");
  }

  if (currentStep === 8 && finalPageInterval) {
    clearInterval(finalPageInterval);
    finalPageInterval = null;
    const decor = document.getElementById("final-decor");
    if (decor) decor.innerHTML = "";
  }

  currentStep += dir;
  if (currentStep < 0) currentStep = 0;
  if (currentStep >= sections.length) currentStep = sections.length - 1;

  if (sections[currentStep]) {
    sections[currentStep].classList.add("active");
  }

  const prev = document.getElementById("prevBtn");
  const next = document.getElementById("nextBtn");
  if (prev)
    prev.style.display =
      currentStep === 0 || currentStep === sections.length - 1
        ? "none"
        : "flex";
  if (next)
    next.style.display = currentStep === sections.length - 1 ? "none" : "flex";

  const progress = ((currentStep + 1) / sections.length) * 100;
  document.getElementById("progress").style.width = progress + "%";

  if (currentStep === 8) {
    startFinalPageDecor();
  }

  if (sections[currentStep]) sections[currentStep].scrollTop = 0;
}

function restartJourney() {
  changeStep(-currentStep);
}

/* =====================================================
   DECORATIONS / EFFECTS
===================================================== */
function startFinalPageDecor() {
  if (finalPageInterval) return;
  finalPageInterval = setInterval(() => {
    const decor = document.getElementById("final-decor");
    if (!decor) return;
    const heart = document.createElement("div");
    const items = ["❤️", "💖", "💕", "🌸", "✨"];
    heart.textContent = items[Math.floor(Math.random() * items.length)];
    heart.className = "absolute text-xl pointer-events-none opacity-40";
    heart.style.left = Math.random() * 100 + "vw";
    heart.style.top = "-5vh";
    decor.appendChild(heart);

    const anim = heart.animate(
      [
        { transform: "translateY(0) rotate(0deg)", opacity: 0.6 },
        {
          transform: `translateY(110vh) rotate(${Math.random() * 360}deg)`,
          opacity: 0,
        },
      ],
      { duration: 4000 + Math.random() * 2000, easing: "linear" }
    );
    anim.onfinish = () => heart.remove();
  }, 500);
}

function revealMessage() {
  document.getElementById("surprise-trigger").classList.add("hidden");
  document.getElementById("surpriseMessage").classList.remove("hidden");
  for (let i = 0; i < 60; i++) {
    setTimeout(createExplosionHeart, i * 40);
  }
}

function createExplosionHeart() {
  const heart = document.createElement("div");
  const items = ["❤️", "💖", "💕", "✨", "🌸", "🍭"];
  heart.textContent = items[Math.floor(Math.random() * items.length)];
  heart.className = "fixed text-2xl pointer-events-none z-[60]";
  heart.style.left = "50vw";
  heart.style.top = "50vh";
  document.body.appendChild(heart);

  const destX = (Math.random() - 0.5) * window.innerWidth * 1.5;
  const destY = (Math.random() - 0.5) * window.innerHeight * 1.5;

  const anim = heart.animate(
    [
      { transform: "translate(-50%, -50%) scale(0)", opacity: 1 },
      {
        transform: `translate(calc(-50% + ${destX}px), calc(-50% + ${destY}px)) scale(${
          Math.random() * 2 + 1
        }) rotate(${Math.random() * 360}deg)`,
        opacity: 0,
      },
    ],
    { duration: 2500, easing: "ease-out" }
  );
  anim.onfinish = () => heart.remove();
}

function createHeroHearts() {
  const container = document.getElementById("hero-hearts");
  if (!container) return;
  const items = ["❤️", "💖", "💕", "✨", "🌸"];
  for (let i = 0; i < 20; i++) {
    const heart = document.createElement("div");
    heart.className = "absolute text-2xl md:text-3xl opacity-20 heart-float";
    heart.textContent = items[Math.floor(Math.random() * items.length)];
    heart.style.left = Math.random() * 100 + "%";
    heart.style.top = Math.random() * 100 + "%";
    heart.style.animationDelay = Math.random() * 5 + "s";
    container.appendChild(heart);
  }
}

/* =====================================================
   COUNTDOWN
===================================================== */
function getNextBirthday() {
  const now = new Date();
  const currentYear = now.getFullYear();
  let birthday = new Date(currentYear, 0, 17); // January 17
  if (now > birthday) {
    birthday = new Date(currentYear + 1, 0, 17);
  }
  return birthday;
}

function updateCountdown() {
  const diff = getNextBirthday() - new Date();

  if (diff < 0) {
    document.getElementById("countdownDisplay").style.display = "none";
    document.getElementById("birthdayMessage").classList.remove("hidden");
    if (countdownInterval) clearInterval(countdownInterval);
    return;
  }

  const days = Math.floor(diff / 864e5);
  const hours = Math.floor((diff % 864e5) / 36e5);
  const minutes = Math.floor((diff % 36e5) / 6e4);
  const seconds = Math.floor((diff % 6e4) / 1e3);

  document.getElementById("days").innerText = String(days).padStart(2, "0");
  document.getElementById("hours").innerText = String(hours).padStart(2, "0");
  document.getElementById("minutes").innerText = String(minutes).padStart(
    2,
    "0"
  );
  document.getElementById("seconds").innerText = String(seconds).padStart(
    2,
    "0"
  );
}

/* =====================================================
   UTILITIES
===================================================== */
function showToast(message, type = "success") {
  const toast = document.createElement("div");
  toast.className = `toast ${
    type === "error" ? "bg-red-500" : "bg-green-500"
  } text-white font-cute font-bold`;
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = "slideIn 0.3s ease-out reverse";
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

/* =====================================================
   EVENTS
===================================================== */
imageInput.addEventListener("change", (e) => {
  handleUpload(e.target.files, "image");
  e.target.value = "";
});

videoInput.addEventListener("change", (e) => {
  handleUpload(e.target.files, "video");
  e.target.value = "";
});

document.addEventListener("keydown", (e) => {
  if (e.key === "ArrowRight" && currentStep < sections.length - 1) {
    changeStep(1);
  } else if (e.key === "ArrowLeft" && currentStep > 0) {
    changeStep(-1);
  }
});

/* =====================================================
   INIT
===================================================== */
function initializeApp() {
  createHeroHearts();
  updateCountdown();
  countdownInterval = setInterval(updateCountdown, 1000);
  loadInitialMedia();
}
initializeApp();

window.addEventListener("beforeunload", () => {
  if (finalPageInterval) clearInterval(finalPageInterval);
  if (countdownInterval) clearInterval(countdownInterval);
});
