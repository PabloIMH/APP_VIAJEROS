import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  doc,
  addDoc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
  orderBy,
  limit,
  deleteField,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDul4Wf-OzhugXQVrDbSF-kR9YEfqf4kXw",
  authDomain: "viajes-677d5.firebaseapp.com",
  projectId: "viajes-677d5",
  storageBucket: "viajes-677d5.firebasestorage.app",
  messagingSenderId: "195586680424",
  appId: "1:195586680424:web:3d639b746b292faa6e7ddd",
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// ─── State ───
let currentUser = null;
let currentTrip = null;
let currentTripId = null;
let selectedCat = "Alojamiento";
let selectedCatIcon = "🏠";
let selectedExpType = "shared";
let tripMembers = [];
window.memberPhotoUrls = {};
let selectedSplitMembers = [];
let unsubscribeExpenses = null;
let unsubscribeNotes = null;
let unsubscribeNotifications = null;
let unsubscribeItinerary = null;
let unsubscribeGallery = null;
let unsubscribeTrip = null;
let unsubscribeGlobalNotifs = null;
let editingExpenseId = null;

// Itinerary state
let selectedItinCat = "Visita";
let selectedItinCatIcon = "🏛️";
let activeItinTags = new Set();
let editingItinEventId = null;
let editingItinDay = null;
let itinVisibleDays = 5;
window._itinInitiallyCollapsed = false;

// Gallery state
let gallerySelectedDay = null;
let galleryPhotoFile = null;
let galleryLbPhotos = [];
let galleryLbIndex = 0;

// Filters state
let currentExpenses = [];
window.expenseFilterText = "";
window.expenseFilterCat = "Todas";

// Notifications state
let notifications = [];
let notifPanelOpen = false;

// ─── Expose globals ───
window.currentTrip = null; // Exponer estado inicial a Leaflet
window.doLogin = doLogin;
window.doRegister = doRegister;
window.doLogout = doLogout;
window.switchAuthTab = switchAuthTab;
window.openModal = openModal;
window.closeModal = closeModal;
window.createTrip = createTrip;
window.joinByCode = joinByCode;
window.goHome = goHome;
window.switchTab = switchTab;
window.switchTabMobile = switchTabMobile;
window.openTripView = openTripView;
window.toggleTripHeroMenu = toggleTripHeroMenu;
window.selectCat = selectCat;
window.selectExpenseType = selectExpenseType;
window.saveExpense = saveExpense;
window.claimPayment = claimPayment;
window.confirmPayment = confirmPayment;
window.addNote = addNote;
window.copyCode = copyCode;
window.openAddExpense = openAddExpense;
window.deleteTrip = deleteTrip;
window.approveDeletion = approveDeletion;
window.rejectDeletion = rejectDeletion;
window.leaveTrip = leaveTrip;
window.editExpense = editExpense;
window.deleteExpense = deleteExpense;
window.openProfile = openProfile;
window.saveBankAccount = saveBankAccount;
window.openPayModal = openPayModal;
window.toggleNotifPanel = toggleNotifPanel;
window.clearNotifications = clearNotifications;
window.onExpenseSearch = onExpenseSearch;
window.clearExpenseSearch = clearExpenseSearch;
window.setExpenseFilterCat = setExpenseFilterCat;
window.openAddItinEvent = openAddItinEvent;
window.openEditItinEvent = openEditItinEvent;
function updateItinFileName(input) {
  const label = document.getElementById("itin-receipt-label");
  const nameDisplay = document.getElementById("itin-file-name-display");
  if (input.files && input.files[0]) {
    nameDisplay.textContent = input.files[0].name;
    label.classList.add("has-file");
  } else {
    nameDisplay.textContent = "Seleccionar foto o comprobante...";
    label.classList.remove("has-file");
  }
}
function deleteItinReceipt() {
  // Mark receipt as deleted
  window._itinDeleteReceipt = true;
  const previewLink = document.getElementById("itin-receipt-preview-link");
  const nameDisplay = document.getElementById("itin-file-name-display");
  const label = document.getElementById("itin-receipt-label");
  previewLink.style.display = "none";
  nameDisplay.textContent = "Seleccionar foto o comprobante...";
  label.classList.remove("has-file");
  document.getElementById("itin-receipt").value = "";
}
window.deleteItinReceipt = deleteItinReceipt;
window.updateItinFileName = updateItinFileName;
window.saveItinEvent = saveItinEvent;
window.deleteItinEvent = deleteItinEvent;
window.selectItinCat = selectItinCat;
window.toggleItinTag = toggleItinTag;
window.toggleItinDay = toggleItinDay;
window.itinLoadMore = itinLoadMore;
window.itinLoadPrev = itinLoadPrev;
window.itinLoadMoreFromStart = itinLoadMoreFromStart;
window.openAddPhoto = openAddPhoto;
window.selectGalleryDay = selectGalleryDay;
window.onGalleryPhotoSelected = onGalleryPhotoSelected;
window.saveGalleryPhoto = saveGalleryPhoto;
window.deleteGalleryPhoto = deleteGalleryPhoto;
window.openGalleryLightbox = openGalleryLightbox;
window.galleryLbNav = galleryLbNav;
window.closeGalleryLightbox = closeGalleryLightbox;
window.openGoogleMaps = openGoogleMaps;
window.toggleUserMenu = toggleUserMenu;
window.closeUserMenu = closeUserMenu;
window.openChangePhotoModal = openChangePhotoModal;
window.onAvatarPhotoSelected = onAvatarPhotoSelected;
window.saveAvatarPhoto = saveAvatarPhoto;
window.scrollToTop = scrollToTop;
window.toggleAllItineraryDays = toggleAllItineraryDays;

// ─── USER MENU ───
let userMenuOpen = false;

function toggleUserMenu() {
  userMenuOpen = !userMenuOpen;
  document
    .getElementById("user-dropdown")
    .classList.toggle("open", userMenuOpen);
  document
    .getElementById("nav-avatar-btn")
    .classList.toggle("open", userMenuOpen);
}

function closeUserMenu() {
  userMenuOpen = false;
  document.getElementById("user-dropdown").classList.remove("open");
  document.getElementById("nav-avatar-btn").classList.remove("open");
}

document.addEventListener("click", (e) => {
  if (!e.target.closest("#user-menu-wrapper") && userMenuOpen) closeUserMenu();
});

async function updateNavAvatar(user) {
  const avatarEl = document.getElementById("nav-avatar");
  // Check if user has a saved photo URL in Firestore
  try {
    const userDoc = await getDoc(doc(db, "users", user.uid));
    const photoUrl = userDoc.exists() ? userDoc.data().photoUrl : null;
    if (photoUrl) {
      avatarEl.innerHTML = `<img src="${photoUrl}" alt="${(user.displayName || "?")[0]}">`;
    } else {
      avatarEl.textContent = user.displayName
        ? user.displayName[0].toUpperCase()
        : "?";
    }
  } catch (e) {
    avatarEl.textContent = user.displayName
      ? user.displayName[0].toUpperCase()
      : "?";
  }
}

// ─── CHANGE AVATAR PHOTO ───
let avatarPhotoFile = null;

function openChangePhotoModal() {
  avatarPhotoFile = null;
  document.getElementById("cp-photo-input").value = "";
  document.getElementById("cp-photo-filename").textContent =
    "Seleccionar foto...";
  document.getElementById("cp-upload-status").style.display = "none";
  document.getElementById("cp-save-btn").disabled = false;
  // Show current avatar in preview
  const ring = document.getElementById("nav-avatar");
  const preview = document.getElementById("cp-preview-avatar");
  preview.innerHTML = ring.innerHTML || ring.textContent;
  openModal("change-photo-modal");
}

function onAvatarPhotoSelected(input) {
  const file = input.files[0];
  if (!file) return;
  avatarPhotoFile = file;
  document.getElementById("cp-photo-filename").textContent = file.name;
  const reader = new FileReader();
  reader.onload = (e) => {
    document.getElementById("cp-preview-avatar").innerHTML =
      `<img src="${e.target.result}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;
  };
  reader.readAsDataURL(file);
}

async function saveAvatarPhoto() {
  if (!avatarPhotoFile) return toast("Selecciona una foto primero");
  const saveBtn = document.getElementById("cp-save-btn");
  const status = document.getElementById("cp-upload-status");
  saveBtn.disabled = true;
  status.style.display = "block";
  try {
    const formData = new FormData();
    formData.append("image", avatarPhotoFile);
    const res = await fetch(
      "https://api.imgbb.com/1/upload?key=ea6a31b8d4d6e7ef9c7c19cd8d6c4d44",
      { method: "POST", body: formData },
    );
    const data = await res.json();
    if (!data.success) {
      toast("Error al subir la foto");
      saveBtn.disabled = false;
      status.style.display = "none";
      return;
    }
    const photoUrl = data.data.url;
    // Save to Firestore
    await setDoc(
      doc(db, "users", currentUser.uid),
      { photoUrl },
      { merge: true },
    );
    // Update nav avatar
    document.getElementById("nav-avatar").innerHTML =
      `<img src="${photoUrl}" alt="${(currentUser.displayName || "?")[0]}">`;
    toast("Foto de perfil actualizada ✓");
    closeModal("change-photo-modal");
  } catch (e) {
    toast("Error: " + e.message);
  }
  saveBtn.disabled = false;
  status.style.display = "none";
}

window.togglePwd = function (inputId, btn) {
  const input = document.getElementById(inputId);
  if (!input) return;
  input.type = input.type === "password" ? "text" : "password";

  // Cambiar el icono SVG según el estado
  if (input.type === "password") {
    // Ojo abierto (mostrar contraseña)
    btn.innerHTML = `
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
            <circle cx="12" cy="12" r="3"></circle>
          </svg>
        `;
    btn.setAttribute("aria-label", "Mostrar contraseña");
  } else {
    // Ojo cerrado (ocultar contraseña)
    btn.innerHTML = `
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
            <line x1="1" y1="1" x2="23" y2="23"></line>
          </svg>
        `;
    btn.setAttribute("aria-label", "Ocultar contraseña");
  }
};

window.scrollTabs = function (dir) {
  const bar = document.getElementById("tabs-bar");
  if (bar) bar.scrollBy({ left: dir * 160, behavior: "smooth" });
};

function updateTabsArrows() {
  const bar = document.getElementById("tabs-bar");
  const wrapper = document.getElementById("tabs-wrapper");
  if (!bar || !wrapper) return;
  const hasOverflow = bar.scrollWidth > bar.clientWidth + 2;
  wrapper.classList.toggle("can-scroll-left", bar.scrollLeft > 4);
  wrapper.classList.toggle(
    "can-scroll-right",
    hasOverflow && bar.scrollLeft < bar.scrollWidth - bar.clientWidth - 4,
  );
}

// Set up tabs scroll listener once DOM is ready
setTimeout(() => {
  const bar = document.getElementById("tabs-bar");
  if (bar) {
    bar.addEventListener("scroll", updateTabsArrows, { passive: true });
    // Use RAF to ensure layout is complete before measuring
    requestAnimationFrame(() => {
      requestAnimationFrame(updateTabsArrows);
    });
  }
}, 100);

// ─── AUTH ───
// Tiempo de inicio para asegurar que el splash screen se vea
const INI_START_TIME = Date.now();
const MIN_SPLASH_TIME = 2000; // 2 segundos de splash screen

// Evitar animación inicial si ya está autenticado
let initialAuthCheck = true;

onAuthStateChanged(auth, (user) => {
  // Si es la carga inicial, calculamos cuánto falta para cumplir el minimo del splash
  let delay = 0;
  if (initialAuthCheck) {
    const elapsed = Date.now() - INI_START_TIME;
    delay = Math.max(0, MIN_SPLASH_TIME - elapsed);
  }

  setTimeout(() => {
    const splashScreen = document.getElementById("splash-screen");
    if (splashScreen && initialAuthCheck) {
      // Ocultar splash screen con transición suave
      splashScreen.style.opacity = "0";
      splashScreen.style.visibility = "hidden";
      setTimeout(() => {
        splashScreen.style.display = "none";
      }, 500);
    }

    if (user) {
      currentUser = user;

      if (initialAuthCheck) {
        // Primera carga: pasar de splash al app
        document.getElementById("auth-screen").style.display = "none";
        document.getElementById("app").style.opacity = "0";
        document.getElementById("app").style.display = "block";
        setTimeout(() => {
          document.getElementById("app").style.opacity = "1";
        }, 50);
      } else {
        // Login posterior: mostrar con animación suave
        document.getElementById("auth-screen").style.opacity = "0";
        setTimeout(() => {
          document.getElementById("auth-screen").style.display = "none";
          document.getElementById("app").style.display = "block";
          document.getElementById("app").style.opacity = "0";
          setTimeout(() => {
            document.getElementById("app").style.opacity = "1";
          }, 50);
        }, 300);
      }

      // Update nav avatar — could be photo URL stored in Firestore
      updateNavAvatar(user);
      document.getElementById("ud-name").textContent =
        user.displayName || "Viajero";
      document.getElementById("ud-email").textContent = user.email || "";
      listenToGlobalNotifications();
      loadTrips();
      const pendingCode = localStorage.getItem("pendingJoinCode");
      if (pendingCode) {
        localStorage.removeItem("pendingJoinCode");
        joinByCodeValue(pendingCode);
      }
    } else {
      currentUser = null;

      if (initialAuthCheck) {
        // Primera carga: pasar de splash a login
        document.getElementById("app").style.display = "none";
        document.getElementById("auth-screen").style.opacity = "0";
        document.getElementById("auth-screen").style.display = "flex";
        setTimeout(() => {
          document.getElementById("auth-screen").style.opacity = "1";
        }, 50);
      } else {
        // Logout: mostrar login con animación suave
        document.getElementById("app").style.opacity = "0";
        setTimeout(() => {
          document.getElementById("app").style.display = "none";
          document.getElementById("auth-screen").style.display = "flex";
          document.getElementById("auth-screen").style.opacity = "0";
          setTimeout(() => {
            document.getElementById("auth-screen").style.opacity = "1";
          }, 50);
        }, 300);
      }
    }

    // Marcar que la verificación inicial ha terminado
    if (initialAuthCheck) {
      initialAuthCheck = false;
    }
  }, delay);
});

async function doLogin() {
  const email = document.getElementById("login-email").value.trim();
  const pass = document.getElementById("login-password").value;
  if (!email) return toast("Ingresa tu correo");
  if (!pass) return toast("Ingresa tu contraseña");
  try {
    await signInWithEmailAndPassword(auth, email, pass);
  } catch (e) {
    toast("Error: " + friendlyError(e.code));
  }
}

async function doRegister() {
  const name = document.getElementById("reg-name").value.trim();
  const email = document.getElementById("reg-email").value.trim();
  const pass = document.getElementById("reg-password").value;
  if (!name) return toast("Ingresa tu nombre");
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    await updateProfile(cred.user, { displayName: name });
    currentUser = { ...cred.user, displayName: name };
  } catch (e) {
    toast("Error: " + friendlyError(e.code));
  }
}

async function doLogout() {
  // Cancel all Firestore listeners before signing out to avoid permission-denied errors
  if (unsubscribeExpenses) {
    unsubscribeExpenses();
    unsubscribeExpenses = null;
  }
  if (unsubscribeNotes) {
    unsubscribeNotes();
    unsubscribeNotes = null;
  }
  if (unsubscribeNotifications) {
    unsubscribeNotifications();
    unsubscribeNotifications = null;
  }
  if (unsubscribeItinerary) {
    unsubscribeItinerary();
    unsubscribeItinerary = null;
  }
  if (unsubscribeGallery) {
    unsubscribeGallery();
    unsubscribeGallery = null;
  }
  if (unsubscribeTrip) {
    unsubscribeTrip();
    unsubscribeTrip = null;
  }
  await signOut(auth);
  document.getElementById("bottom-nav").style.display = "none";
}

function switchAuthTab(tab) {
  document
    .querySelectorAll(".auth-tab")
    .forEach((t, i) =>
      t.classList.toggle(
        "active",
        (i === 0 && tab === "login") || (i === 1 && tab === "register"),
      ),
    );
  document.getElementById("login-form").style.display =
    tab === "login" ? "block" : "none";
  document.getElementById("register-form").style.display =
    tab === "register" ? "block" : "none";
}

// Hacer funciones disponibles globalmente
window.doLogin = doLogin;
window.doRegister = doRegister;
window.doLogout = doLogout;
window.switchAuthTab = switchAuthTab;
window.toggleTheme = toggleTheme;

// ─── TRIPS ───
async function loadTrips() {
  const q = query(
    collection(db, "trips"),
    where("memberIds", "array-contains", currentUser.uid),
  );
  const snap = await getDocs(q);
  const trips = [];
  snap.forEach((d) => trips.push({ id: d.id, ...d.data() }));
  renderTrips(trips);
}

// ─── COVER PHOTOS ───
const COVER_PHOTOS = [
  // Europa
  {
    id: "eu1",
    label: "Europa",
    url: "https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=800&q=80",
  }, // Paris
  {
    id: "eu2",
    label: "Europa",
    url: "https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=800&q=80",
  }, // Roma
  {
    id: "eu3",
    label: "Europa",
    url: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=80",
  }, // Amsterdam canales
  {
    id: "eu4",
    label: "Europa",
    url: "https://images.unsplash.com/photo-1486299267070-83823f5448dd?w=800&q=80",
  }, // Londres Tower Bridge
  {
    id: "eu5",
    label: "Europa",
    url: "https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=800&q=80",
  }, // Santorini
  {
    id: "eu6",
    label: "Europa",
    url: "https://images.unsplash.com/photo-1531973576160-7125cd663d86?w=800&q=80",
  }, // Barcelona
  // Italia
  {
    id: "it1",
    label: "Italia",
    url: "https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?w=800&q=80",
  }, // Venecia
  {
    id: "it2",
    label: "Italia",
    url: "https://images.unsplash.com/photo-1516483638261-f4dbaf036963?w=800&q=80",
  }, // Dolomitas
  {
    id: "it3",
    label: "Italia",
    url: "https://images.unsplash.com/photo-1534445867742-43195f401b6c?w=800&q=80",
  }, // Amalfi
  // Asia
  {
    id: "as1",
    label: "Asia",
    url: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=800&q=80",
  }, // Tokio noche
  {
    id: "as2",
    label: "Asia",
    url: "https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=800&q=80",
  }, // Japón monte fuji
  {
    id: "as3",
    label: "Asia",
    url: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=800&q=80",
  }, // Bali templo
  {
    id: "as4",
    label: "Asia",
    url: "https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?w=800&q=80",
  }, // Tailandia templos
  // Latinoamérica
  {
    id: "la1",
    label: "Latinoamérica",
    url: "https://images.unsplash.com/photo-1526392060635-9d6019884377?w=800&q=80",
  }, // Machu Picchu
  {
    id: "la2",
    label: "Latinoamérica",
    url: "https://images.unsplash.com/photo-1501854140801-50d01698950b?w=800&q=80",
  }, // Patagonia
  {
    id: "la3",
    label: "Latinoamérica",
    url: "https://images.unsplash.com/photo-1508193638397-1c4234db14d8?w=800&q=80",
  }, // Carretera Austral
  {
    id: "la4",
    label: "Latinoamérica",
    url: "https://images.unsplash.com/photo-1585208798174-6cedd86e019a?w=800&q=80",
  }, // Buenos Aires
  {
    id: "la5",
    label: "Latinoamérica",
    url: "https://images.unsplash.com/photo-1504893524553-b855bce32c67?w=800&q=80",
  }, // Atacama
  // Playa & Caribe
  {
    id: "pl1",
    label: "Playa & Caribe",
    url: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80",
  }, // Playa tropical
  {
    id: "pl2",
    label: "Playa & Caribe",
    url: "https://images.unsplash.com/photo-1590523277543-a94d2e4eb00b?w=800&q=80",
  }, // Maldivas
  {
    id: "pl3",
    label: "Playa & Caribe",
    url: "https://images.unsplash.com/photo-1519046904884-53103b34b206?w=800&q=80",
  }, // Caribe aguas turquesa
  // Road Trip & Aventura
  {
    id: "rd1",
    label: "Road Trip",
    url: "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800&q=80",
  }, // Ruta desierto
  {
    id: "rd2",
    label: "Road Trip",
    url: "https://images.unsplash.com/photo-1494783367193-149034c05e8f?w=800&q=80",
  }, // Carretera montaña
  {
    id: "rd3",
    label: "Road Trip",
    url: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800&q=80",
  }, // París road trip
  // Nieve & Ski
  {
    id: "sk1",
    label: "Nieve & Ski",
    url: "https://images.unsplash.com/photo-1548777123-e216912df7d8?w=800&q=80",
  }, // Esquí pista
  {
    id: "sk2",
    label: "Nieve & Ski",
    url: "https://images.unsplash.com/photo-1520209759809-a9bcb6cb3241?w=800&q=80",
  }, // Alpes invierno
];

let selectedCoverUrl = null;
let editCoverSelectedUrl = null;

function getCoverGroups() {
  const groups = {};
  COVER_PHOTOS.forEach((p) => {
    if (!groups[p.label]) groups[p.label] = [];
    groups[p.label].push(p);
  });
  return groups;
}

function buildCoverSelector(tabsElId, gridElId, previewElId, currentUrl) {
  const tabsEl = document.getElementById(tabsElId);
  const groups = getCoverGroups();
  const labels = Object.keys(groups);
  // Pick starting tab: the one that contains the current URL, else first
  const matchLabel = currentUrl
    ? COVER_PHOTOS.find((p) => p.url === currentUrl)?.label
    : null;
  const startLabel = matchLabel || labels[0];

  tabsEl.innerHTML = labels
    .map(
      (l) =>
        `<button class="cover-tab-btn${l === startLabel ? " active" : ""}" data-label="${l}"
          onclick="switchCoverTab('${tabsElId}','${gridElId}','${previewElId}',this,'${l}')">${l}</button>`,
    )
    .join("");

  renderCoverTabPhotos(tabsElId, gridElId, previewElId, groups[startLabel]);
}

window.switchCoverTab = function (tabsElId, gridElId, previewElId, btn, label) {
  document
    .getElementById(tabsElId)
    ?.querySelectorAll(".cover-tab-btn")
    .forEach((b) => b.classList.remove("active"));
  btn.classList.add("active");
  renderCoverTabPhotos(
    tabsElId,
    gridElId,
    previewElId,
    getCoverGroups()[label] || [],
  );
};

function renderCoverTabPhotos(tabsElId, gridElId, previewElId, photos) {
  const isEdit = tabsElId.includes("edit");
  const selUrl = isEdit ? editCoverSelectedUrl : selectedCoverUrl;
  const gridEl = document.getElementById(gridElId);
  if (!gridEl) return;
  gridEl.innerHTML = photos
    .map(
      (p) =>
        `<div class="cover-option${selUrl === p.url ? " selected" : ""}" id="${tabsElId}-${p.id}"
          onclick="pickCoverPhoto('${p.id}','${p.url}','${tabsElId}','${previewElId}')">
          <img src="${p.url}" loading="lazy">
        </div>`,
    )
    .join("");
}

window.pickCoverPhoto = function (id, url, tabsElId, previewElId) {
  const isEdit = tabsElId.includes("edit");
  if (isEdit) editCoverSelectedUrl = url;
  else selectedCoverUrl = url;
  document
    .querySelectorAll(`[id^="${tabsElId}-"]`)
    .forEach((el) => el.classList.remove("selected"));
  document.getElementById(`${tabsElId}-${id}`)?.classList.add("selected");
  const preview = document.getElementById(previewElId);
  if (preview)
    preview.innerHTML = `<img src="${url}" style="width:100%;height:100%;object-fit:cover">`;
};

function renderCoverGrid() {
  selectedCoverUrl = null;
  buildCoverSelector("cover-tabs", "cover-grid", "cover-preview", null);
  document.getElementById("cover-preview").innerHTML =
    "Sin portada seleccionada";
}

function selectCover(id, url) {
  pickCoverPhoto(id, url, "cover-tabs", "cover-preview");
}

window.selectCover = selectCover;
window.renderCoverGrid = renderCoverGrid;
window.openEditCoverModal = openEditCoverModal;
window.saveEditCover = saveEditCover;

function openEditCoverModal() {
  editCoverSelectedUrl = currentTrip?.coverUrl || null;
  buildCoverSelector(
    "edit-cover-tabs",
    "edit-cover-grid",
    "edit-cover-preview",
    editCoverSelectedUrl,
  );
  const preview = document.getElementById("edit-cover-preview");
  if (editCoverSelectedUrl) {
    preview.innerHTML = `<img src="${editCoverSelectedUrl}" style="width:100%;height:100%;object-fit:cover">`;
  } else {
    preview.innerHTML = "Sin portada seleccionada";
  }
  openModal("edit-cover-modal");
}

async function saveEditCover() {
  if (!editCoverSelectedUrl || !currentTripId)
    return toast("Selecciona una foto primero");
  await updateDoc(doc(db, "trips", currentTripId), {
    coverUrl: editCoverSelectedUrl,
  });
  currentTrip.coverUrl = editCoverSelectedUrl;
  // Update hero live
  const hero = document.getElementById("trip-hero");
  const heroBg = document.getElementById("trip-hero-bg");
  const heroOverlay = document.getElementById("trip-hero-overlay");
  heroBg.style.backgroundImage = `url('${editCoverSelectedUrl}')`;
  heroOverlay.style.display = "";
  hero.classList.remove("no-cover");
  hero.classList.add("has-cover");
  toast("Portada actualizada ✓");
  closeModal("edit-cover-modal");
  loadTrips();
}

function renderTrips(trips) {
  const container = document.getElementById("trips-list");
  if (!trips.length) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">🗺️</div><p>No tienes viajes aún</p><small>Crea uno o únete con un código</small></div>`;
    return;
  }
  const months = [
    "Ene",
    "Feb",
    "Mar",
    "Abr",
    "May",
    "Jun",
    "Jul",
    "Ago",
    "Sep",
    "Oct",
    "Nov",
    "Dic",
  ];
  container.innerHTML = trips
    .map((t) => {
      const bgStyle = t.coverUrl
        ? `background-image:url('${t.coverUrl}')`
        : `background:var(--surface2)`;
      const hasPhoto = !!t.coverUrl;
      const dateStr = t.startDate
        ? (() => {
          const s = new Date(t.startDate + "T12:00:00");
          const e = t.endDate ? new Date(t.endDate + "T12:00:00") : null;
          return `${s.getDate()} ${months[s.getMonth()]} → ${e ? e.getDate() + " " + months[e.getMonth()] : "?"}`;
        })()
        : null;
      return `<div class="trip-card" onclick="openTripView('${t.id}')">
          ${hasPhoto ? `<div class="trip-card-bg" style="${bgStyle}"></div><div class="trip-card-overlay"></div>` : ""}
          <div class="trip-card-body" style="${!hasPhoto ? "background:var(--surface);border-radius:var(--radius)" : ""}">
            <div class="trip-card-top">
              <div class="trip-card-arrow">→</div>
            </div>
            <div class="trip-card-name" style="${!hasPhoto ? "color:var(--text)" : ""}">${t.name}</div>
            <div class="trip-card-meta">
              ${t.description ? `<span class="trip-card-pill" style="${!hasPhoto ? "background:var(--surface2);border-color:var(--border);color:var(--text2)" : ""}">${t.description}</span>` : ""}
              <span class="trip-card-pill" style="${!hasPhoto ? "background:var(--surface2);border-color:var(--border);color:var(--text2)" : ""}">👥 ${t.memberIds?.length || 1}</span>
              ${dateStr ? `<span class="trip-card-pill" style="${!hasPhoto ? "background:var(--surface2);border-color:var(--border);color:var(--text2)" : ""}">📅 ${dateStr}</span>` : ""}
              <span class="trip-card-pill" style="${!hasPhoto ? "background:var(--surface2);border-color:var(--border);color:var(--text2)" : ""}">${t.currency || "CLP"}</span>
            </div>
          </div>
        </div>`;
    })
    .join("");
}

async function createTrip() {
  const name = document.getElementById("trip-name-input").value.trim();
  const desc = document.getElementById("trip-desc-input").value.trim();
  const currency = document.getElementById("trip-currency").value;
  if (!name) return toast("Ponle nombre al viaje ✈️");
  const code = Math.random().toString(36).substr(2, 6).toUpperCase();
  const startDate = document.getElementById("trip-start-date").value;
  const endDate = document.getElementById("trip-end-date").value;
  const tripData = {
    name,
    description: desc,
    currency,
    code,
    startDate,
    endDate,
    createdBy: currentUser.uid,
    memberIds: [currentUser.uid],
    members: [
      {
        uid: currentUser.uid,
        name: currentUser.displayName || currentUser.email,
      },
    ],
    createdAt: serverTimestamp(),
  };
  if (selectedCoverUrl) tripData.coverUrl = selectedCoverUrl;
  const ref = await addDoc(collection(db, "trips"), tripData);
  closeModal("create-trip-modal");
  selectedCoverUrl = null;
  toast("Viaje creado! 🎉");
  loadTrips();
  setTimeout(() => openTripView(ref.id), 400);
}

async function joinByCode() {
  const code = document.getElementById("join-code").value.trim().toUpperCase();
  if (!code) return;
  if (!currentUser) {
    localStorage.setItem("pendingJoinCode", code);
    toast("Inicia sesión para unirte");
    return;
  }
  await joinByCodeValue(code);
}

async function joinByCodeValue(code) {
  const q = query(collection(db, "trips"), where("code", "==", code));
  const snap = await getDocs(q);
  if (snap.empty) return toast("Código no encontrado");
  const tripDoc = snap.docs[0];
  const trip = tripDoc.data();
  if (trip.memberIds.includes(currentUser.uid))
    return toast("Ya eres miembro de este viaje");
  await updateDoc(doc(db, "trips", tripDoc.id), {
    memberIds: arrayUnion(currentUser.uid),
    members: arrayUnion({
      uid: currentUser.uid,
      name: currentUser.displayName || currentUser.email,
    }),
  });
  toast("¡Te uniste al viaje! 🎉");
  loadTrips();
  setTimeout(() => openTripView(tripDoc.id), 400);
}

// ─── TRIP VIEW ───
async function openTripView(tripId) {
  const docSnap = await getDoc(doc(db, "trips", tripId));
  if (!docSnap.exists()) return;
  currentTripId = tripId;
  currentTrip = { id: tripId, ...docSnap.data() };
  window.currentTrip = currentTrip; // Exponer al mapa globalmente

  tripMembers = currentTrip.members || [];

  document.getElementById("home-view").style.display = "none";
  document.getElementById("trip-view").style.display = "block";
  document.getElementById("tv-name").textContent = currentTrip.name;
  document.getElementById("tv-desc").textContent =
    currentTrip.description || "";

  // Mostrar banner de solicitud de eliminación si existe
  updateDeletionRequestBanner();

  // Escuchar cambios en el viaje para actualizar el banner
  if (unsubscribeTrip) {
    unsubscribeTrip();
    unsubscribeTrip = null;
  }
  unsubscribeTrip = onSnapshot(doc(db, "trips", tripId), (docSnap) => {
    if (docSnap.exists()) {
      currentTrip = { id: tripId, ...docSnap.data() };
      window.currentTrip = currentTrip; // Mantener sincronizada la global
      updateDeletionRequestBanner();
    }
  });

  // Apply cover photo to hero
  const hero = document.getElementById("trip-hero");
  const heroBg = document.getElementById("trip-hero-bg");
  const heroOverlay = document.getElementById("trip-hero-overlay");
  if (currentTrip.coverUrl) {
    heroBg.style.backgroundImage = `url('${currentTrip.coverUrl}')`;
    heroOverlay.style.display = "";
    hero.classList.remove("no-cover");
    hero.classList.add("has-cover");
  } else {
    heroBg.style.backgroundImage = "";
    heroOverlay.style.display = "none";
    hero.classList.remove("has-cover");
    hero.classList.add("no-cover");
  }

  // Dates strip
  const datesEl = document.getElementById("tv-dates");
  if (currentTrip.startDate) {
    const months = [
      "Ene",
      "Feb",
      "Mar",
      "Abr",
      "May",
      "Jun",
      "Jul",
      "Ago",
      "Sep",
      "Oct",
      "Nov",
      "Dic",
    ];
    const weekDays = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
    const s = new Date(currentTrip.startDate + "T12:00:00");
    const e = currentTrip.endDate
      ? new Date(currentTrip.endDate + "T12:00:00")
      : null;
    const allDays = getDaysBetween(currentTrip.startDate, currentTrip.endDate);
    const totalDays = allDays.length;
    const durationLabel = totalDays > 1 ? `${totalDays} días` : "1 día";
    datesEl.innerHTML = `<div class="trip-date-strip">
          <div class="trip-date-col">
            <div class="trip-date-label">Inicio</div>
            <div class="trip-date-value">${s.getDate()} ${months[s.getMonth()]}</div>
            <div class="trip-date-sub">${weekDays[s.getDay()]} ${s.getFullYear()}</div>
          </div>
          <div class="trip-date-arrow">
            <div class="trip-date-duration">${durationLabel}</div>
            <div class="trip-date-arrow-line"></div>
          </div>
          <div class="trip-date-col">
            <div class="trip-date-label">Regreso</div>
            <div class="trip-date-value">${e ? e.getDate() + " " + months[e.getMonth()] : "?"}</div>
            <div class="trip-date-sub">${e ? weekDays[e.getDay()] + " " + e.getFullYear() : ""}</div>
          </div>
        </div>`;
  } else {
    datesEl.innerHTML = "";
  }

  // Render member chips with photos
  const memberChipsContainer = document.getElementById("tv-members");
  memberChipsContainer.innerHTML = tripMembers
    .map(
      (m) => `
        <div class="member-chip">
          <div class="avatar member-avatar" style="width:26px;height:26px;font-size:0.7rem" id="mavatar-${m.uid}">${(m.name || "?")[0].toUpperCase()}</div>
          ${m.name.split(" ")[0]}
        </div>
      `,
    )
    .join("");
  // Async load photos for each member
  window.memberPhotoUrls = {};
  tripMembers.forEach(async (m) => {
    try {
      const userDoc = await getDoc(doc(db, "users", m.uid));
      const photoUrl = userDoc.exists() ? userDoc.data().photoUrl : null;
      if (photoUrl) {
        window.memberPhotoUrls[m.uid] = photoUrl;

        // Update all elements rendering this member's avatar
        const els = document.querySelectorAll(".mavatar-" + m.uid);
        els.forEach(el => el.innerHTML = `<img src="${photoUrl}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`);

        // Fallback for ID backwards compatibility
        const el = document.getElementById("mavatar-" + m.uid);
        if (el)
          el.innerHTML = `<img src="${photoUrl}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;
      }
    } catch (e) { }
  });
  subscribeExpenses();
  subscribeNotes();
  subscribeNotifications(tripId);
  subscribeItinerary();
  subscribeGallery();

  // Now that the trip subscriptions are set, enable the FAB and default tab
  switchTab("shared");
  document.getElementById("bottom-nav").style.display = "block";
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      updateTabsArrows();
      updateBnavHint();
    }),
  );
  // Ensure FAB visibility matches the active tab now that we're in trip view
  const fab = document.getElementById("fab-btn");
  if (fab)
    fab.style.display = window._currentTabType === "balance" ? "none" : "flex";
  document.body.classList.add("trip-view-active");

  const dangerBtn = document.getElementById("trip-action-btn");
  const dangerLabel = document.getElementById("trip-action-label");
  if (dangerLabel)
    dangerLabel.textContent =
      currentTrip.createdBy === currentUser.uid
        ? "Eliminar viaje"
        : "Salir del viaje";
  if (dangerBtn)
    dangerBtn.querySelector(".sidebar-icon").innerHTML =
      currentTrip.createdBy === currentUser.uid ? "🗑️" : "🚪";
}

function goHome() {
  document.getElementById("home-view").style.display = "block";
  document.getElementById("trip-view").style.display = "none";
  document.getElementById("profile-view").style.display = "none";
  document.getElementById("bottom-nav").style.display = "none";
  document.getElementById("fab-btn").style.display = "none";
  document.body.classList.remove("trip-view-active");

  // Reset scroll to top
  window.scrollTo(0, 0);
  document.getElementById("home-view").scrollTop = 0;

  if (unsubscribeExpenses) {
    unsubscribeExpenses();
    unsubscribeExpenses = null;
  }
  if (unsubscribeNotes) {
    unsubscribeNotes();
    unsubscribeNotes = null;
  }
  if (unsubscribeNotifications) {
    unsubscribeNotifications();
    unsubscribeNotifications = null;
  }
  if (unsubscribeItinerary) {
    unsubscribeItinerary();
    unsubscribeItinerary = null;
  }
  if (unsubscribeGallery) {
    unsubscribeGallery();
    unsubscribeGallery = null;
  }
  currentTripId = null;
  currentTrip = null;
  loadTrips();
}

function switchTab(tab) {
  window._currentTabType = tab === "personal" ? "personal" : "shared";
  document
    .querySelectorAll(".section-panel")
    .forEach((p) => p.classList.remove("active"));
  document.getElementById("panel-" + tab).classList.add("active");

  // Sync sidebar buttons
  ["shared", "personal", "balance", "notes", "itinerary", "gallery"].forEach(
    (t) => {
      const btn = document.getElementById("sb-" + t);
      if (btn) btn.classList.toggle("active", t === tab);
    },
  );

  if (tab === "balance") renderDashboard();
  if (tab === "itinerary") renderItinerary(true);
  if (tab === "gallery") renderGallery();

  const filtersBar = document.getElementById("expense-filters-bar");
  if (filtersBar) {
    if (tab === "shared" || tab === "personal") {
      filtersBar.style.display = "flex";
      applyExpenseFilters();
    } else {
      filtersBar.style.display = "none";
    }
  }

  const fab = document.getElementById("fab-btn");
  if (tab === "balance" || tab === "itinerary") {
    fab.style.display = "none";
  } else if (tab === "notes") {
    fab.style.display = "flex";
    fab.title = "Escribir nota";
    fab.onclick = () => {
      const input = document.getElementById("note-input");
      if (input) {
        input.scrollIntoView({ behavior: "smooth", block: "center" });
        setTimeout(() => input.focus(), 300);
      }
    };
  } else if (tab === "gallery") {
    fab.style.display = "flex";
    fab.title = "Agregar foto";
    fab.onclick = () => openAddPhoto();
  } else {
    fab.style.display = "flex";
    fab.title = "Agregar gasto";
    fab.onclick = () => openAddExpense(window._currentTabType || "shared");
  }

  // Ocultar botón "Volver arriba" al cambiar de pestaña si no es itinerario
  if (tab !== "itinerary") {
    const scrollTopBtn = document.getElementById("scroll-top-btn");
    if (scrollTopBtn) scrollTopBtn.classList.remove("visible");
  }
}

function switchTabMobile(tab) {
  window._currentTabType = tab === "personal" ? "personal" : "shared";
  switchTab(tab);
  ["shared", "personal", "balance", "notes", "itinerary", "gallery"].forEach(
    (t) => {
      const btn = document.getElementById("bnav-" + t);
      if (btn) btn.classList.toggle("active", t === tab);
    },
  );
  // Scroll active tab into view smoothly
  const activeBtn = document.getElementById("bnav-" + tab);
  if (activeBtn)
    activeBtn.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
  updateBnavHint();
}

function updateBnavHint() {
  const inner = document.getElementById("bottom-nav-inner");
  const hint = document.getElementById("bnav-more-hint");
  const wrap = document.getElementById("bottom-nav-wrap");
  if (!inner || !hint) return;
  const hasMore = inner.scrollLeft < inner.scrollWidth - inner.clientWidth - 4;
  hint.classList.toggle("visible", hasMore);
  if (wrap) wrap.classList.toggle("has-more", hasMore);
}

// Init bottom nav hint listener
setTimeout(() => {
  const inner = document.getElementById("bottom-nav-inner");
  if (inner) {
    inner.addEventListener("scroll", updateBnavHint, { passive: true });
    updateBnavHint();
  }
}, 600);

// ─── NOTIFICATIONS (in-app, Firestore realtime) ───
function subscribeNotifications(tripId) {
  if (unsubscribeNotifications) unsubscribeNotifications();

  const expQ = query(
    collection(db, "trips", tripId, "expenses"),
    orderBy("createdAt", "desc"),
    limit(20),
  );
  let firstLoad = true;
  let prevPayments = {};

  unsubscribeNotifications = onSnapshot(expQ, (snap) => {
    if (firstLoad) {
      // Store initial payment states to detect changes later
      snap.docs.forEach((d) => {
        prevPayments[d.id] = { ...(d.data().payments || {}) };
      });
      firstLoad = false;
      return;
    }

    snap.docChanges().forEach((change) => {
      const e = change.doc.data();
      const expId = change.doc.id;
      const currency = currentTrip?.currency || "CLP";
      const desc = e.description ? `"${e.description}"` : "un gasto";
      const amount = formatAmount(e.amount, currency);

      // ── Nuevo gasto agregado por otro miembro ──
      if (change.type === "added") {
        if (e.createdBy && e.createdBy !== currentUser.uid) {
          const author = tripMembers.find((m) => m.uid === e.createdBy);
          const authorName = author ? author.name.split(" ")[0] : "Alguien";
          addNotification({
            icon: "🧾",
            text: `<strong>${authorName}</strong> registró un nuevo gasto: ${desc} por ${amount}`,
            time: "ahora",
            _key: `added-${expId}`,
          });
        }
        prevPayments[expId] = { ...(e.payments || {}) };
      }

      // ── Cambios en pagos ──
      if (change.type === "modified") {
        const payments = e.payments || {};
        const prev = prevPayments[expId] || {};

        Object.entries(payments).forEach(([uid, state]) => {
          const prevState = prev[uid];
          if (state === prevState) return; // no change

          const member = tripMembers.find((m) => m.uid === uid);
          const memberName = member ? member.name.split(" ")[0] : "Alguien";
          const key = `${state}-${expId}-${uid}`;
          if (notifications.some((n) => n._key === key)) return; // no duplicates

          // Alguien marcó su pago como "claimed" (quiere pagar) → notificar al creador
          if (
            state === "claimed" &&
            prevState !== "claimed" &&
            e.createdBy === currentUser.uid &&
            uid !== currentUser.uid
          ) {
            const msg = `<strong>${memberName}</strong> marcó su parte como pagada en ${desc} — esperando confirmación`;
            addNotification({
              icon: "🔔",
              text: msg,
              time: "ahora",
              _key: key,
            });
            // Show toast/push popup on screen
            if (window.showNotification) {
              window.showNotification("Pago por confirmar", `¡${memberName} ha pagado su parte en ${desc}!`, "info", 5000);
            }
          }

          // El creador confirmó el pago de alguien → notificar a ese miembro
          if (
            state === "confirmed" &&
            uid === currentUser.uid &&
            e.createdBy !== currentUser.uid
          ) {
            const creator = tripMembers.find((m) => m.uid === e.createdBy);
            const creatorName = creator
              ? creator.name.split(" ")[0]
              : "Alguien";
            addNotification({
              icon: "✅",
              text: `<strong>${creatorName}</strong> confirmó tu pago en ${desc}`,
              time: "ahora",
              _key: key,
            });
          }
        });

        prevPayments[expId] = { ...payments };
      }
    });
  });
}

function addNotification(notif) {
  notifications.unshift({ ...notif, id: Date.now(), read: false });
  renderNotifications();
  // Animate bell
  const bell = document.getElementById("bell-btn");
  bell.classList.remove("has-notif");
  void bell.offsetWidth; // reflow
  bell.classList.add("has-notif");
}

function renderNotifications() {
  const unread = notifications.filter((n) => !n.read).length;
  const badge = document.getElementById("bell-badge");
  if (unread > 0) {
    badge.style.display = "flex";
    badge.textContent = unread > 9 ? "9+" : unread;
  } else {
    badge.style.display = "none";
  }

  const list = document.getElementById("notif-list");
  if (!notifications.length) {
    list.innerHTML = '<div class="notif-empty">Sin notificaciones aún 🔔</div>';
    return;
  }
  list.innerHTML = notifications
    .slice(0, 15)
    .map(
      (n) => `
        <div class="notif-item ${n.read ? "" : "unread"}">
          <div class="notif-dot ${n.read ? "read" : ""}"></div>
          <div>
            <div class="notif-text">${n.icon} ${n.text}</div>
            <div class="notif-time">${n.time}</div>
          </div>
        </div>
      `,
    )
    .join("");
}

function listenToGlobalNotifications() {
  if (unsubscribeGlobalNotifs) unsubscribeGlobalNotifs();
  if (!currentUser) return;

  const q = query(
    collection(db, "users", currentUser.uid, "notifications"),
    orderBy("createdAt", "desc"),
    limit(20)
  );

  unsubscribeGlobalNotifs = onSnapshot(q, (snap) => {
    // Check if new notifications were added to show the popup
    snap.docChanges().forEach((change) => {
      if (change.type === "added") {
        const notif = change.doc.data();
        // Solo mostramos popup si no está leída y tiene menos de un par de días para no hacer spam de antiguas
        if (window.showNotification && !notif.read && notif.createdAt) {
          const ageHours = (Date.now() - (notif.createdAt.seconds * 1000)) / 1000 / 3600;
          if (ageHours < 24) {
            window.showNotification(notif.title || "Notificación", notif.body, "info", 6000);
          }
        }
      }
    });

    notifications = [];
    snap.forEach((d) => {
      const data = d.data();
      notifications.push({
        id: d.id,
        _isDb: true,
        ...data,
        text: `<strong>${data.title}</strong><br>${data.body}`,
        time: "reciente"
      });
    });
    renderNotifications();
  });
}

function toggleNotifPanel() {
  const panel = document.getElementById("notif-panel");
  notifPanelOpen = !notifPanelOpen;
  panel.classList.toggle("open", notifPanelOpen);

  if (notifPanelOpen) {
    // Mark all as read when opening
    notifications.forEach((n) => {
      n.read = true;
      if (n._isDb && n.id) {
        updateDoc(doc(db, "users", currentUser.uid, "notifications", n.id), { read: true }).catch(console.error);
      }
    });
    renderNotifications();
  }
}

function toggleTripHeroMenu() {
  const dropdown = document.getElementById("trip-hero-dropdown");
  dropdown.classList.toggle("open");
}

function clearNotifications() {
  notifications = [];
  renderNotifications();
  document.getElementById("notif-panel").classList.remove("open");
  notifPanelOpen = false;
}

// Close notif panel on outside click
document.addEventListener("click", (e) => {
  if (!e.target.closest("#bell-wrapper") && !e.target.closest(".notif-panel")) {
    document.getElementById("notif-panel").classList.remove("open");
    notifPanelOpen = false;
  }
  // Close trip hero menu on outside click
  if (
    !e.target.closest(".trip-hero-menu") &&
    !e.target.closest(".trip-hero-dropdown")
  ) {
    document.getElementById("trip-hero-dropdown").classList.remove("open");
  }
  // Close kebab menus on outside click
  if (
    !e.target.closest('[id^="kebab-"]') &&
    !e.target.classList.contains("dots-btn")
  ) {
    document
      .querySelectorAll('[id^="kebab-"]')
      .forEach((m) => (m.style.display = "none"));
  }
  // Close itin kebab menus
  if (
    !e.target.closest('[id^="itin-kebab-"]') &&
    !e.target.closest(".itin-action-btn")
  ) {
    document
      .querySelectorAll('[id^="itin-kebab-"]')
      .forEach((m) => (m.style.display = "none"));
  }
});

// ─── EXPENSE FILTERS LOGIC ───
function onExpenseSearch(val) {
  window.expenseFilterText = val.toLowerCase().trim();
  const clearBtn = document.getElementById("expense-clear-btn");
  if (clearBtn) clearBtn.style.display = window.expenseFilterText ? "flex" : "none";
  applyExpenseFilters();
}

function clearExpenseSearch() {
  const input = document.getElementById("expense-search-input");
  if (input) input.value = "";
  onExpenseSearch("");
}

function setExpenseFilterCat(cat, btn) {
  window.expenseFilterCat = cat;
  document.querySelectorAll(".filter-cat-pill").forEach((b) => b.classList.remove("active"));
  if (btn) btn.classList.add("active");
  applyExpenseFilters();
}

function applyExpenseFilters() {
  let filtered = currentExpenses;

  // 1. Text Search
  if (window.expenseFilterText) {
    filtered = filtered.filter(e => {
      const desc = (e.description || "").toLowerCase();
      const c1 = (e.category || "").toLowerCase();
      return desc.includes(window.expenseFilterText) || c1.includes(window.expenseFilterText);
    });
  }

  // 2. Category Filter
  if (window.expenseFilterCat !== "Todas") {
    filtered = filtered.filter(e => e.category === window.expenseFilterCat);
  }

  // Split and render
  const shared = filtered.filter((e) => e.type === "shared");
  const personal = filtered.filter((e) => e.type === "personal" && e.createdBy === currentUser.uid);

  renderSharedExpenses(shared);
  renderPersonalExpenses(personal);
}

// ─── EXPENSES ───
function subscribeExpenses() {
  if (unsubscribeExpenses) unsubscribeExpenses();
  const q = query(collection(db, "trips", currentTripId, "expenses"));
  unsubscribeExpenses = onSnapshot(q, (snap) => {
    currentExpenses = [];
    snap.forEach((d) => currentExpenses.push({ id: d.id, ...d.data() }));
    // Instead of rendering directly, go through filters
    applyExpenseFilters();
  });
}

function renderSharedExpenses(expenses) {
  const container = document.getElementById("shared-list");
  if (!expenses.length) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">💸</div><p>Sin gastos compartidos aún</p><small>Toca + para agregar el primero</small></div>`;
    return;
  }
  expenses.sort(
    (a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0),
  );
  container.innerHTML = expenses
    .map((e) => renderExpenseCard(e, true))
    .join("");
}

function renderPersonalExpenses(expenses) {
  const container = document.getElementById("personal-list");
  if (!expenses.length) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">🔒</div><p>Sin gastos personales</p><small>Solo tú puedes verlos</small></div>`;
    return;
  }
  expenses.sort((a, b) => {
    const da = a.date || "";
    const db2 = b.date || "";
    if (da && db2) return db2.localeCompare(da);
    return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
  });
  const total = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const currency = currentTrip?.currency || "CLP";
  const totalBar = `<div class="total-bar"><div><div class="total-bar-label">Total mis gastos personales</div><div style="font-size:0.78rem;color:var(--text3);margin-top:2px">${expenses.length} gasto${expenses.length !== 1 ? "s" : ""}</div></div><div class="total-bar-amount">${formatAmount(total, currency)}</div></div>`;
  container.innerHTML =
    totalBar + expenses.map((e) => renderExpenseCard(e, false)).join("");
}

function renderExpenseCard(e, showPayments) {
  const splitWith = e.splitWith || tripMembers.map((m) => m.uid);
  const currency = currentTrip?.currency || "CLP";
  const catColors = {
    Alojamiento: "#5b8cf7",
    Vuelo: "#e8c97a",
    Auto: "#f0a050",
    Tren: "#a0c4ff",
    Comida: "#7cefb0",
    Actividades: "#f07878",
    Compras: "#b07cef",
    Entretenimiento: "#ef9b7c",
    Salud: "#7cd4ef",
    Otro: "#8a8fa3",
  };
  const color = catColors[e.category] || "#5b8cf7";
  const catIcons = { Alojamiento: "🏠", Vuelo: "✈️", Auto: "🚗", Tren: "🚂", Comida: "🍽️", Actividades: "🎯", Compras: "🛍️", Entretenimiento: "🎉", Salud: "💊", Otro: "📦" };
  const icon = e.icon || catIcons[e.category] || "📦";

  // Calcular monto por persona según splitMode
  let perPersonDisplay = "";
  if (showPayments && splitWith.length > 1) {
    if (e.splitMode === "custom") {
      perPersonDisplay = "personalizado";
    } else {
      const pp = Math.round(e.amount / splitWith.length);
      perPersonDisplay = formatAmount(pp, currency) + " c/u";
    }
  }

  // Etiqueta moneda original si se pagó en EUR/USD
  const origTag =
    e.currencyOrig && e.currencyOrig !== "CLP" && e.amountOrig
      ? `<span style="background:rgba(232,201,122,0.15);color:var(--accent);border-radius:10px;padding:2px 7px;font-size:0.72rem;font-weight:600;margin-left:4px">${e.amountOrig % 1 === 0 ? e.amountOrig : e.amountOrig.toFixed(2)} ${e.currencyOrig}</span>`
      : "";

  // Etiqueta propina
  const tipTag =
    e.tipType && e.tipType !== "none" && e.tipAmount > 0
      ? `<span style="background:rgba(124,239,176,0.12);color:var(--accent3);border-radius:10px;padding:2px 7px;font-size:0.72rem;font-weight:600;margin-left:4px">+${formatAmount(e.tipAmount, currency)} propina</span>`
      : "";

  let paymentsHtml = "";
  if (showPayments && splitWith.length > 0) {
    const isCreator = e.createdBy === currentUser.uid;
    const pills = splitWith
      .map((uid) => {
        const member = tripMembers.find((m) => m.uid === uid);
        const name = member ? member.name : uid;
        const firstName = name.split(" ")[0];
        const isPayer = uid === e.paidBy;
        const payState = isPayer ? "confirmed" : e.payments?.[uid] || "unpaid";

        // Monto personalizado de esta persona
        const personalAmt =
          e.splitMode === "custom" && e.splitAmounts?.[uid]
            ? ` · ${formatAmount(e.splitAmounts[uid], currency)}`
            : "";

        let pillClass,
          pillIcon,
          pillTitle,
          clickAttr = "";
        if (payState === "confirmed") {
          pillClass = "confirmed";
          pillIcon = "✓";
          pillTitle = isPayer ? "Pagador original" : "Confirmado";
        } else if (payState === "claimed") {
          if (isCreator && uid !== currentUser.uid) {
            pillClass = "claimed can-confirm";
            pillIcon = "🔔";
            pillTitle = "Clic para confirmar";
            clickAttr = `onclick="confirmPayment('${e.id}','${uid}')"`;
          } else {
            pillClass = "claimed";
            pillIcon = "⏱️";
            pillTitle = uid === currentUser.uid ? "Clic para cancelar pago" : "Esperando confirmación";
            if (uid === currentUser.uid) {
              clickAttr = `onclick="promptClaimPayment('${e.id}','${uid}')"`;
              pillClass += " editable";
            }
          }
        } else {
          pillClass = "unpaid";
          pillIcon = "○";
          // Allow each member to edit only their own part for 'Comida' category (opens modal)
          if (uid === currentUser.uid && e.category === "Comida") {
            pillTitle = "Clic para editar tu parte";
            clickAttr = `onclick="openEditShareModal('${e.id}','${uid}')"`;
            pillClass += " editable";
          } else if (uid === currentUser.uid && e.category !== "Comida") {
            // For non-food categories, keep previous behavior: allow claim toggle
            pillTitle = "Clic para marcar pagado";
            clickAttr = `onclick="promptClaimPayment('${e.id}','${uid}')"`;
          } else {
            pillTitle = "Pendiente";
          }
        }
        return `<div class="payment-pill ${pillClass}" ${clickAttr} title="${pillTitle}"><span class="pill-icon">${pillIcon}</span> ${firstName}${isPayer ? " 💳" : ""}${personalAmt}</div>`;
      })
      .join("");
    paymentsHtml = `<div class="payments-section"><div class="payments-label">Confirmaciones de pago</div><div class="payment-pills">${pills}</div></div>`;
  }

  const paidByMember = tripMembers.find((m) => m.uid === e.paidBy);
  const paidByName = paidByMember ? paidByMember.name.split(" ")[0] : "Alguien";
  const canEdit = e.createdBy === currentUser.uid;
  const dotsMenu = canEdit
    ? `<div style="position:relative;flex-shrink:0;margin-left:4px">
        <button class="dots-btn" onclick="toggleKebab('${e.id}', event)" style="font-size:1.2rem;width:28px;height:28px">⋮</button>
        <div id="kebab-${e.id}" style="display:none;position:absolute;top:100%;right:0;margin-top:4px;background:var(--surface2);border:1px solid var(--border);border-radius:10px;min-width:160px;z-index:9999;box-shadow:0 8px 32px rgba(0,0,0,0.7)">
          <div onclick="editExpense('${e.id}')" style="padding:12px 16px;cursor:pointer;font-size:0.88rem;color:var(--text2)">✏️ Editar gasto</div>
          <div onclick="deleteExpense('${e.id}')" style="padding:12px 16px;cursor:pointer;font-size:0.88rem;color:var(--danger)">🗑️ Eliminar gasto</div>
        </div>
      </div>`
    : "";
  const receiptBtn = e.receiptUrl
    ? `<button class="btn btn-ghost btn-sm" onclick="openLightbox('${e.receiptUrl}')" style="width:fit-content;max-width:none;border:1px solid var(--border);font-size:0.75rem;padding:4px 8px">📎 Ver Boleta</button>`
    : "";
  const editPartBtn =
    e.category === "Comida" && (e.splitWith || []).includes(currentUser.uid)
      ? `<button class="btn btn-ghost btn-sm" onclick="openEditShareModal('${e.id}','${currentUser.uid}')" style="width:fit-content;max-width:none">✏️ Editar mi parte</button>`
      : "";

  return `<div class="expense-card">
        <div class="expense-header">
          <div class="expense-icon" style="background:${color}22;color:${color}">${icon}</div>
          <div class="expense-details">
            <div class="expense-title">${e.description}${origTag}${tipTag}</div>
            <div class="expense-meta">
              <span>💳 ${paidByName} <span style="cursor:pointer;color:var(--accent2);font-size:0.78rem" onclick="openPayModal('${e.paidBy}', event)">ver datos →</span></span>
              <span>${e.category || "Otro"}</span>
              <span>${e.date || ""}</span>
              ${showPayments ? `<span>👤 ${splitWith.length} personas</span>` : ""}
            </div>
          </div>
          <div style="display:flex;align-items:flex-start;gap:4px">
            <div class="expense-amount">
              <div class="total">${formatAmount(e.amount, currency)}</div>
              ${perPersonDisplay ? `<div class="per-person">${perPersonDisplay}</div>` : ""}
            </div>
            ${dotsMenu}
          </div>
        </div>
        ${receiptBtn || editPartBtn ? `<div class="expense-btn-row">${receiptBtn}${editPartBtn}</div>` : ""}
        ${paymentsHtml}
      </div>`;
}

async function claimPayment(expenseId, uid) {
  const expRef = doc(db, "trips", currentTripId, "expenses", expenseId);
  const expSnap = await getDoc(expRef);
  if (!expSnap.exists()) return;
  const expData = expSnap.data();
  const payments = { ...(expData.payments || {}) };
  if (payments[uid] === "claimed") {
    delete payments[uid];
    await updateDoc(expRef, { payments });
    toast("Pago desmarcado");
  } else {
    payments[uid] = "claimed";
    await updateDoc(expRef, { payments });
    toast("🕐 Marcado como pagado — esperando confirmación");

    // Notify the creator persistently via Firestore
    if (expData.createdBy && expData.createdBy !== currentUser.uid) {
      await addDoc(collection(db, "users", expData.createdBy, "notifications"), {
        tripId: currentTripId,
        title: "Confirmación de pago",
        body: `${currentUser.displayName || "Un viajero"} marcó su parte como pagada en "${expData.description}". ¡Confírmalo!`,
        icon: "💳",
        read: false,
        createdAt: serverTimestamp(),
      }).catch((e) => console.log("Error notifications: Firestore rules blocking write", e));
    }
  }
}

window.promptClaimPayment = async function (expenseId, uid) {
  const expRef = doc(db, "trips", currentTripId, "expenses", expenseId);
  const expSnap = await getDoc(expRef);
  if (!expSnap.exists()) return;

  const payments = { ...(expSnap.data().payments || {}) };

  // Si ya estaba reclamado, al hacer clic simplemente lo desmarcamos sin preguntar
  if (payments[uid] === "claimed") {
    delete payments[uid];
    await updateDoc(expRef, { payments });
    toast("Pago desmarcado");
    return;
  }

  // Si no estaba reclamado, abrimos el modal
  const confirmBtn = document.getElementById('confirm-pay-btn');
  confirmBtn.onclick = () => {
    closeModal('confirm-pay-modal');
    claimPayment(expenseId, uid);
  };
  openModal('confirm-pay-modal');
};

async function confirmPayment(expenseId, uid) {
  const expRef = doc(db, "trips", currentTripId, "expenses", expenseId);
  const expSnap = await getDoc(expRef);
  if (!expSnap.exists()) return;
  const payments = { ...(expSnap.data().payments || {}) };
  const member = tripMembers.find((m) => m.uid === uid);
  const name = member ? member.name.split(" ")[0] : "esta persona";
  payments[uid] = "confirmed";
  await updateDoc(expRef, { payments });
  toast("✅ Confirmado — " + name + " pagó su parte");
}

// ─── ADD EXPENSE ───
let splitMode = "equal"; // 'equal' | 'custom'
let customSplitAmounts = {}; // { uid: amount }
let tipType = "none"; // 'none' | 'pct' | 'fixed'
let currentRate = null; // EUR/USD → CLP rate cache
let currentExpCurrency = "CLP";

// Obtener tasa de cambio desde exchangerate-api (gratuita, sin key)
async function fetchRate(from) {
  if (from === "CLP") return 1;
  try {
    const res = await fetch(`https://open.er-api.com/v6/latest/${from}`);
    const data = await res.json();
    return data.rates?.CLP || null;
  } catch {
    return null;
  }
}

window.onExpCurrencyChange = async function () {
  currentExpCurrency = document.getElementById("exp-currency").value;
  const convBox = document.getElementById("clp-conversion");
  if (currentExpCurrency === "CLP") {
    convBox.style.display = "none";
    currentRate = null;
  } else {
    convBox.style.display = "block";
    document.getElementById("clp-loader").style.display = "inline";
    document.getElementById("clp-conversion-text").textContent = "";
    document.getElementById("clp-rate-text").textContent = "";
    currentRate = await fetchRate(currentExpCurrency);
    document.getElementById("clp-loader").style.display = "none";
    if (currentRate) {
      document.getElementById("clp-rate-text").textContent =
        `1 ${currentExpCurrency} = ${Math.round(currentRate).toLocaleString("es-CL")} CLP`;
      onAmountInput();
    } else {
      document.getElementById("clp-conversion-text").textContent =
        "No se pudo obtener la tasa";
    }
  }
  updateExpensePreview();
};

window.onAmountInput = function () {
  const amount = parseFloat(document.getElementById("exp-amount").value) || 0;
  // Conversión en tiempo real
  if (currentExpCurrency !== "CLP" && currentRate && amount > 0) {
    const clp = Math.round(amount * currentRate);
    document.getElementById("clp-conversion-text").textContent =
      `≈ ${clp.toLocaleString("es-CL")} CLP`;
  }
  // Propina
  updateTipCalc(amount);
  updateExpensePreview();
};

window.selectTipType = function (type) {
  tipType = type;
  ["none", "pct", "fixed"].forEach((t) => {
    document
      .getElementById("tip-type-" + t)
      .classList.toggle("selected", t === type);
  });
  const wrap = document.getElementById("tip-input-wrap");
  wrap.style.display = type === "none" ? "none" : "flex";
  if (type !== "none") {
    document.getElementById("tip-unit").textContent =
      type === "pct" ? "%" : currentExpCurrency;
    document.getElementById("tip-value").placeholder =
      type === "pct" ? "10" : "3";
  }
  updateTipCalc(parseFloat(document.getElementById("exp-amount").value) || 0);
};

function updateTipCalc(baseAmount) {
  if (tipType === "none") return;
  const tipVal = parseFloat(document.getElementById("tip-value")?.value) || 0;
  let tipTotal = 0;
  const currency = currentExpCurrency;
  const tripCurrency = currentTrip?.currency || "CLP";
  if (tipType === "pct") {
    tipTotal = baseAmount * (tipVal / 100);
    document.getElementById("tip-calc-text").textContent =
      tipTotal > 0
        ? `= ${formatAmount(Math.round(tipTotal), currency)} de propina (se distribuye proporcional)`
        : "";
  } else {
    tipTotal = tipVal;
    document.getElementById("tip-calc-text").textContent =
      tipTotal > 0
        ? `= ${formatAmount(tipTotal, currency)} dividido en partes iguales`
        : "";
  }
  updateExpensePreview();
}

// Calcula el monto final incluyendo propina (en la moneda original)
function calcFinalAmount() {
  const base = parseFloat(document.getElementById("exp-amount").value) || 0;
  if (tipType === "none") return base;
  const tipVal = parseFloat(document.getElementById("tip-value")?.value) || 0;
  if (tipType === "pct") return base + base * (tipVal / 100);
  return base + tipVal;
}

// Convierte a CLP si es necesario
function toTripCurrency(amount) {
  if (currentExpCurrency === "CLP" || !currentRate) return amount;
  return amount * currentRate;
}

window.setSplitMode = function (mode) {
  splitMode = mode;
  document
    .getElementById("split-mode-equal")
    .classList.toggle("selected", mode === "equal");
  document
    .getElementById("split-mode-custom")
    .classList.toggle("selected", mode === "custom");
  renderSplitMembers();
  updateExpensePreview();
};

function openAddExpense(forceType) {
  // forceType: 'shared' | 'personal' — determined by current tab context
  if (!currentTripId) return;
  const expType = forceType || "shared";
  document.getElementById("exp-desc").value = "";
  document.getElementById("exp-desc-counter").textContent = "0/25";
  document.getElementById("exp-amount").value = "";
  document.getElementById("exp-date").value = new Date()
    .toISOString()
    .split("T")[0];
  document.getElementById("exp-currency").value = "CLP";
  document.getElementById("clp-conversion").style.display = "none";
  document.getElementById("receipt-upload-status").style.display = "none";
  const fileInput = document.getElementById("exp-receipt");
  if (fileInput) {
    fileInput.value = "";
    if (window.updateFileName) window.updateFileName(fileInput);
  }

  // Reset states
  selectedExpType = expType;
  selectedCat = "Alojamiento";
  selectedCatIcon = "🏠";
  splitMode = "equal";
  tipType = "none";
  currentRate = null;
  currentExpCurrency = "CLP";
  customSplitAmounts = {};

  // Reset tip UI — hidden by default, only shows for Comida category
  ["none", "pct", "fixed"].forEach((t) =>
    document.getElementById("tip-type-" + t).classList.remove("selected"),
  );
  document.getElementById("tip-type-none").classList.add("selected");
  document.getElementById("tip-input-wrap").style.display = "none";
  document.getElementById("tip-calc-text") &&
    (document.getElementById("tip-calc-text").textContent = "");
  document.getElementById("tip-group").style.display = "none";

  // Reset split mode UI
  document.getElementById("split-mode-equal").classList.add("selected");
  document.getElementById("split-mode-custom").classList.remove("selected");
  document.getElementById("split-custom-validation").style.display = "none";

  const paidBySelect = document.getElementById("exp-paidby");
  paidBySelect.innerHTML = tripMembers
    .map(
      (m) =>
        `<option value="${m.uid}" ${m.uid === currentUser.uid ? "selected" : ""}>${m.name}</option>`,
    )
    .join("");
  selectedSplitMembers = tripMembers.map((m) => m.uid);
  renderSplitMembers();

  // Reset cat buttons
  document
    .querySelectorAll("#add-expense-modal .category-grid .cat-btn")
    .forEach((b, i) => b.classList.toggle("selected", i === 0));

  // Configure modal based on expense type — hide type selector since context is known
  const typeRow = document.getElementById("expense-type-row");
  if (typeRow) typeRow.style.display = "none";

  if (expType === "shared") {
    document.getElementById("type-shared").classList.add("selected");
    document.getElementById("type-personal").classList.remove("selected");
    document.getElementById("split-group").style.display = "block";
    document.getElementById("paidby-group").style.display = "block";
  } else {
    document.getElementById("type-personal").classList.add("selected");
    document.getElementById("type-shared").classList.remove("selected");
    document.getElementById("split-group").style.display = "none";
    document.getElementById("paidby-group").style.display = "none";
  }

  editingExpenseId = null;
  document.getElementById("expense-modal-title").innerHTML =
    expType === "shared"
      ? "💸 Agregar Gasto Compartido"
      : "🔒 Agregar Gasto Personal";
  document.getElementById("exp-preview").style.display = "none";
  openModal("add-expense-modal");
}

window.updateFileName = function (input) {
  const display = document.getElementById("file-name-display");
  const icon = document.getElementById("file-icon-display");
  const label = input.nextElementSibling;
  if (input.files && input.files.length > 0) {
    display.textContent = input.files[0].name;
    icon.innerHTML = "✅";
    label.classList.add("has-file");
  } else {
    display.textContent = "Seleccionar foto o boleta...";
    icon.innerHTML = "📸";
    label.classList.remove("has-file");
  }
};

function renderSplitMembers() {
  const container = document.getElementById("split-members");
  if (splitMode === "equal") {
    container.innerHTML = tripMembers
      .map((m) => {
        const checked = selectedSplitMembers.includes(m.uid);
        return `<div class="member-check-item ${checked ? "checked" : ""}" onclick="toggleSplitMember('${m.uid}', this)">
            <div class="check-circle">${checked ? "✓" : ""}</div>
            <div class="avatar mavatar-${m.uid}" style="width:28px;height:28px;font-size:0.75rem">${window.memberPhotoUrls[m.uid] ? `<img src="${window.memberPhotoUrls[m.uid]}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">` : (m.name || "?")[0].toUpperCase()}</div>
            <span style="flex:1">${m.name}</span>
          </div>`;
      })
      .join("");
  } else {
    // Modo personalizado: input de monto por persona
    container.innerHTML = tripMembers
      .map((m) => {
        const val = customSplitAmounts[m.uid] || "";
        return `<div class="member-check-item checked" style="cursor:default">
            <div class="avatar mavatar-${m.uid}" style="width:28px;height:28px;font-size:0.75rem">${window.memberPhotoUrls[m.uid] ? `<img src="${window.memberPhotoUrls[m.uid]}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">` : (m.name || "?")[0].toUpperCase()}</div>
            <span style="flex:1">${m.name}</span>
            <input type="number" min="0" placeholder="0"
              value="${val}"
              style="width:100px;padding:6px 10px;font-size:0.88rem;text-align:right"
              oninput="updateCustomAmount('${m.uid}', this.value)"
            >
          </div>`;
      })
      .join("");
    validateCustomSplit();
  }
}

window.updateCustomAmount = function (uid, val) {
  customSplitAmounts[uid] = parseFloat(val) || 0;
  validateCustomSplit();
  updateExpensePreview();
};

function validateCustomSplit() {
  const finalAmount = calcFinalAmount();
  const amountInCurrency = finalAmount; // mismo que ingresado
  const sumCustom = Object.values(customSplitAmounts).reduce(
    (a, b) => a + b,
    0,
  );
  const validation = document.getElementById("split-custom-validation");
  validation.style.display = "block";
  const diff = Math.abs(sumCustom - amountInCurrency);
  if (diff < 0.5) {
    validation.style.background = "rgba(124,239,176,0.1)";
    validation.style.color = "var(--accent3)";
    validation.textContent = "✓ Los montos suman correctamente";
  } else {
    validation.style.background = "rgba(240,120,120,0.1)";
    validation.style.color = "var(--danger)";
    const remaining = amountInCurrency - sumCustom;
    validation.textContent =
      remaining > 0
        ? `Faltan ${formatAmount(Math.round(remaining), currentExpCurrency)} por asignar`
        : `Excede por ${formatAmount(Math.round(-remaining), currentExpCurrency)}`;
  }
}

window.toggleSplitMember = function (uid, el) {
  const idx = selectedSplitMembers.indexOf(uid);
  if (idx > -1) {
    if (selectedSplitMembers.length <= 1)
      return toast("Debe haber al menos una persona");
    selectedSplitMembers.splice(idx, 1);
    el.classList.remove("checked");
    el.querySelector(".check-circle").textContent = "";
  } else {
    selectedSplitMembers.push(uid);
    el.classList.add("checked");
    el.querySelector(".check-circle").textContent = "✓";
  }
  updateExpensePreview();
};

function updateExpensePreview() {
  const baseAmount =
    parseFloat(document.getElementById("exp-amount").value) || 0;
  const finalAmount = calcFinalAmount();
  const preview = document.getElementById("exp-preview");
  const tripCurrency = currentTrip?.currency || "CLP";
  const finalInCLP = Math.round(toTripCurrency(finalAmount));

  if (baseAmount > 0 && selectedExpType === "shared") {
    let html = "";
    if (splitMode === "equal" && selectedSplitMembers.length > 0) {
      const perPerson = Math.round(finalInCLP / selectedSplitMembers.length);
      html = `💡 <strong>${formatAmount(finalInCLP, tripCurrency)}</strong> ÷ ${selectedSplitMembers.length} personas = <strong style="color:var(--accent)">${formatAmount(perPerson, tripCurrency)} c/u</strong>`;
      if (tipType !== "none") {
        const tipAmountCLP = Math.round(
          toTripCurrency(finalAmount - baseAmount),
        );
        html += ` <span style="color:var(--text3)">(incluye ${formatAmount(tipAmountCLP, tripCurrency)} propina)</span>`;
      }
      if (currentExpCurrency !== "CLP" && currentRate) {
        html += `<br><span style="color:var(--text3);font-size:0.78rem">Total en CLP: ${formatAmount(finalInCLP, "CLP")}</span>`;
      }
    } else if (splitMode === "custom") {
      const sumCustom = Object.values(customSplitAmounts).reduce(
        (a, b) => a + b,
        0,
      );
      html = `💡 Asignado: <strong style="color:var(--accent)">${formatAmount(Math.round(toTripCurrency(sumCustom)), tripCurrency)}</strong> de <strong>${formatAmount(finalInCLP, tripCurrency)}</strong>`;
    }
    if (html) {
      preview.style.display = "block";
      preview.innerHTML = html;
    } else preview.style.display = "none";
  } else {
    preview.style.display = "none";
  }
}

function selectExpenseType(type) {
  selectedExpType = type;
  document
    .getElementById("type-shared")
    .classList.toggle("selected", type === "shared");
  document
    .getElementById("type-personal")
    .classList.toggle("selected", type === "personal");
  document.getElementById("split-group").style.display =
    type === "shared" ? "block" : "none";
  document.getElementById("paidby-group").style.display =
    type === "shared" ? "block" : "none";
  // Tip only shows for Comida + shared
  const tipGroup = document.getElementById("tip-group");
  if (tipGroup)
    tipGroup.style.display =
      type === "shared" && selectedCat === "Comida" ? "block" : "none";
  updateExpensePreview();
}

async function saveExpense() {
  const desc = document.getElementById("exp-desc").value.trim();
  const baseAmount = parseFloat(document.getElementById("exp-amount").value);
  const date = document.getElementById("exp-date").value;
  if (!desc) return toast("Agrega una descripción");
  if (!baseAmount || baseAmount <= 0)
    return toast("El monto debe ser mayor a 0");

  // Calcular monto final con propina
  const finalAmountOrig = calcFinalAmount();
  // Convertir a CLP (moneda del viaje)
  let finalAmountCLP = Math.round(toTripCurrency(finalAmountOrig));

  // Validar división personalizada: sólo exigir suma si se ingresaron montos
  if (splitMode === "custom" && selectedExpType === "shared") {
    const sumCustom = Object.values(customSplitAmounts).reduce(
      (a, b) => a + b,
      0,
    );
    if (sumCustom > 0) {
      const diff = Math.abs(sumCustom - finalAmountOrig);
      if (diff > 0.5)
        return toast("Los montos personalizados no suman el total");
    }
    // si sumCustom === 0 entonces permitimos crear el gasto y que cada miembro complete su parte luego
  }

  const fileInput = document.getElementById("exp-receipt");
  const file = fileInput ? fileInput.files[0] : null;
  const saveBtn = document.querySelector("#add-expense-modal .btn-primary");
  const statusText = document.getElementById("receipt-upload-status");
  let finalReceiptUrl = null;

  if (file) {
    saveBtn.disabled = true;
    statusText.style.display = "block";
    const formData = new FormData();
    formData.append("image", file);
    try {
      const res = await fetch(
        "https://api.imgbb.com/1/upload?key=ea6a31b8d4d6e7ef9c7c19cd8d6c4d44",
        { method: "POST", body: formData },
      );
      const data = await res.json();
      if (data.success) finalReceiptUrl = data.data.url;
      else toast("Error al subir la imagen a ImgBB");
    } catch (e) {
      toast("Error subiendo foto: " + e.message);
    }
    saveBtn.disabled = false;
    statusText.style.display = "none";
  }

  const paidBy =
    selectedExpType === "shared"
      ? document.getElementById("exp-paidby").value
      : currentUser.uid;

  // Construir splitAmounts en CLP (incluir sólo si el autor ingresó montos personalizados)
  let splitAmounts = null;
  if (splitMode === "custom" && selectedExpType === "shared") {
    const sumCustom = Object.values(customSplitAmounts).reduce(
      (a, b) => a + b,
      0,
    );
    if (sumCustom > 0) {
      splitAmounts = {};
      Object.entries(customSplitAmounts).forEach(([uid, amt]) => {
        if (amt && amt > 0) splitAmounts[uid] = Math.round(toTripCurrency(amt));
      });
    }
  }

  const expData = {
    description: desc,
    amount: finalAmountCLP,
    amountOrig: finalAmountOrig,
    currencyOrig: currentExpCurrency,
    rateUsed: currentRate || 1,
    tipType,
    tipAmount: Math.round(toTripCurrency(finalAmountOrig - baseAmount)),
    category: selectedCat,
    categoryIcon: selectedCatIcon,
    date,
    type: selectedExpType,
    paidBy,
    // Siempre registrar quiénes participan; en modo custom los montos pueden llegar después
    splitWith:
      selectedExpType === "shared"
        ? selectedSplitMembers.length > 0
          ? selectedSplitMembers
          : tripMembers.map((m) => m.uid)
        : [currentUser.uid],
    splitMode,
    ...(splitAmounts && { splitAmounts }),
  };
  if (finalReceiptUrl) expData.receiptUrl = finalReceiptUrl;

  if (editingExpenseId) {
    await updateDoc(
      doc(db, "trips", currentTripId, "expenses", editingExpenseId),
      expData,
    );
    toast("Gasto actualizado ✓");
    editingExpenseId = null;
  } else {
    await addDoc(collection(db, "trips", currentTripId, "expenses"), {
      ...expData,
      payments: {},
      createdBy: currentUser.uid,
      createdAt: serverTimestamp(),
    });
    toast("Gasto guardado ✓");
  }
  closeModal("add-expense-modal");
  if (selectedExpType !== "personal") switchTab("shared");
  else switchTab("personal");
}

// ─── TRIP DELETION ───
async function deleteTrip(tripId, name) {
  try {
    // Si estás solo en el viaje, puedes eliminar directamente
    const members = currentTrip.members || [];
    if (members.length <= 1) {
      const ok = await customConfirm({
        icon: "🗑️",
        title: "¿Eliminar viaje?",
        msg: `"${name}" y todos sus gastos se borrarán para siempre.`,
        okLabel: "Sí, eliminar",
        okClass: "btn-danger",
      });
      if (!ok) return;

      // Eliminar directamente
      await executeTripDeletion(tripId);
      return;
    }

    // Iniciar proceso de consenso para eliminar viaje (múltiples miembros)
    const ok = await customConfirm({
      icon: "🗑️",
      title: "¿Solicitar eliminar viaje?",
      msg: `Se solicitará eliminar "${name}". Todos los miembros deben estar de acuerdo.`,
      okLabel: "Solicitar eliminación",
      okClass: "btn-danger",
    });
    if (!ok) return;

    await requestTripDeletion(tripId, name);
  } catch (error) {
    console.error("Error en deleteTrip:", error);
    toast("Error al procesar solicitud: " + error.message);
  }
}

async function requestTripDeletion(tripId, name) {
  // Crear solicitud de eliminación
  const deletionRequest = {
    requestedBy: currentUser.uid,
    requestedByName: currentUser.displayName || currentUser.email,
    requestedAt: serverTimestamp(),
    status: "pending", // pending | approved | rejected
    approvals: [], // Array de UIDs que han aprobado
    rejections: [], // Array de UIDs que han rechazado
  };

  await updateDoc(doc(db, "trips", tripId), {
    deletionRequest: deletionRequest,
  });

  toast("Solicitud de eliminación enviada 👍");

  // Notificar a todos los miembros
  const members = currentTrip.members || [];
  members.forEach((member) => {
    if (member.uid !== currentUser.uid) {
      addNotification(tripId, member.uid, "delete_request", {
        requesterName: currentUser.displayName || currentUser.email,
        tripName: name,
      });
    }
  });
}

async function leaveTrip(tripId, name) {
  const ok = await customConfirm({
    icon: "🚪",
    title: "¿Salir del viaje?",
    msg: `Dejarás el viaje "${name}". Puedes volver a unirte con el código.`,
    okLabel: "Salir",
    okClass: "btn-danger",
  });
  if (!ok) return;
  await updateDoc(doc(db, "trips", tripId), {
    memberIds: arrayRemove(currentUser.uid),
    members: arrayRemove(tripMembers.find((m) => m.uid === currentUser.uid)),
  });
  toast("Saliste del viaje");
  goHome();
}

// ─── DELETION CONSENSUS ───
async function approveDeletion(tripId) {
  if (
    !currentTrip?.deletionRequest ||
    currentTrip.deletionRequest.status !== "pending"
  )
    return;

  const updatedRequest = {
    ...currentTrip.deletionRequest,
    approvals: [
      ...(currentTrip.deletionRequest.approvals || []),
      currentUser.uid,
    ],
    rejections: (currentTrip.deletionRequest.rejections || []).filter(
      (uid) => uid !== currentUser.uid,
    ),
  };

  await updateDoc(doc(db, "trips", tripId), {
    deletionRequest: updatedRequest,
  });

  // Verificar si todos han aprobado
  const allMembers = currentTrip.members || [];
  const otherMembers = allMembers.filter(
    (m) => m.uid !== currentTrip.deletionRequest.requestedBy,
  );
  const requiredApprovals = otherMembers.length;

  if (updatedRequest.approvals.length >= requiredApprovals) {
    // Todos están de acuerdo, eliminar el viaje
    await executeTripDeletion(tripId);
  } else {
    toast("Tu aprobación ha sido registrada ✅");
  }
}

async function rejectDeletion(tripId) {
  if (
    !currentTrip?.deletionRequest ||
    currentTrip.deletionRequest.status !== "pending"
  )
    return;

  const updatedRequest = {
    ...currentTrip.deletionRequest,
    rejections: [
      ...(currentTrip.deletionRequest.rejections || []),
      currentUser.uid,
    ],
    status: "rejected",
  };

  await updateDoc(doc(db, "trips", tripId), {
    deletionRequest: updatedRequest,
  });
  toast("Has rechazado la eliminación del viaje ❌");
}

async function executeTripDeletion(tripId) {
  try {
    const expSnap = await getDocs(collection(db, "trips", tripId, "expenses"));
    for (const d of expSnap.docs)
      await deleteDoc(doc(db, "trips", tripId, "expenses", d.id));
    const notesSnap = await getDocs(collection(db, "trips", tripId, "notes"));
    for (const d of notesSnap.docs)
      await deleteDoc(doc(db, "trips", tripId, "notes", d.id));
    await deleteDoc(doc(db, "trips", tripId));
    toast("Viaje eliminado 🗑️");
    goHome();
  } catch (error) {
    console.error("Error al eliminar viaje:", error);
    toast("Error al eliminar viaje: " + error.message);
  }
}

function updateDeletionRequestBanner() {
  const banner = document.getElementById("deletion-request-banner");
  const desc = document.getElementById("deletion-request-desc");
  const progress = document.getElementById("deletion-request-progress");

  if (
    !currentTrip?.deletionRequest ||
    currentTrip.deletionRequest.status !== "pending"
  ) {
    banner.style.display = "none";
    return;
  }

  const request = currentTrip.deletionRequest;
  const allMembers = currentTrip.members || [];
  const otherMembers = allMembers.filter((m) => m.uid !== request.requestedBy);
  const approvals = request.approvals || [];
  const rejections = request.rejections || [];

  // Ocultar botones para el solicitante y para quienes ya votaron
  const actions = banner.querySelector(".deletion-request-actions");
  if (
    request.requestedBy === currentUser.uid ||
    approvals.includes(currentUser.uid) ||
    rejections.includes(currentUser.uid)
  ) {
    actions.style.display = "none";
  } else {
    actions.style.display = "flex";
  }

  desc.textContent = `${request.requestByName} solicitó eliminar este viaje`;

  const approvedCount = approvals.length;
  const requiredCount = otherMembers.length;
  progress.textContent = `${approvedCount} de ${requiredCount} miembros han aprobado`;

  banner.style.display = "block";
}

async function editExpense(expId) {
  document
    .querySelectorAll(".dropdown-menu")
    .forEach((m) => m.classList.remove("open"));
  const expSnap = await getDoc(
    doc(db, "trips", currentTripId, "expenses", expId),
  );
  if (!expSnap.exists()) return;
  const e = { id: expId, ...expSnap.data() };
  editingExpenseId = expId;
  selectedExpType = e.type;
  selectedCat = e.category || "Alojamiento";
  selectedCatIcon = e.categoryIcon || "🏠";
  selectedSplitMembers = e.splitWith || tripMembers.map((m) => m.uid);
  document.getElementById("expense-modal-title").textContent =
    "✏️ Editar Gasto";
  document.getElementById("exp-desc").value = e.description;
  document.getElementById("exp-amount").value = e.amount;
  document.getElementById("exp-date").value = e.date || "";
  const paidBySelect = document.getElementById("exp-paidby");
  paidBySelect.innerHTML = tripMembers
    .map(
      (m) =>
        `<option value="${m.uid}" ${m.uid === e.paidBy ? "selected" : ""}>${m.name}</option>`,
    )
    .join("");
  document
    .getElementById("type-shared")
    .classList.toggle("selected", e.type === "shared");
  document
    .getElementById("type-personal")
    .classList.toggle("selected", e.type === "personal");
  document.getElementById("split-group").style.display =
    e.type === "shared" ? "block" : "none";
  document.getElementById("paidby-group").style.display =
    e.type === "shared" ? "block" : "none";
  // Show type row when editing
  const typeRow = document.getElementById("expense-type-row");
  if (typeRow) typeRow.style.display = "block";
  // Show tip only for Comida + shared
  const tipGroupEl = document.getElementById("tip-group");
  if (tipGroupEl)
    tipGroupEl.style.display =
      e.type === "shared" && e.category === "Comida" ? "block" : "none";
  document.querySelectorAll(".category-grid .cat-btn").forEach((btn) => {
    const catName = btn.getAttribute("onclick")?.match(/'([^']+)'/)?.[1];
    btn.classList.toggle("selected", catName === e.category);
  });
  renderSplitMembers();
  document.getElementById("exp-amount").oninput = updateExpensePreview;
  updateExpensePreview();
  openModal("add-expense-modal");
}

// ─── EDIT SHARE (member inputs their calculated total and marks paid) ───
let _editingShare = {
  expId: null,
  uid: null,
  expense: null,
  shareRate: null,
  isPaid: false,
};
async function openEditShareModal(expId, uid) {
  try {
    const expRef = doc(db, "trips", currentTripId, "expenses", expId);
    const snap = await getDoc(expRef);
    if (!snap.exists()) return;
    const e = snap.data();
    _editingShare = { expId, uid, expense: e, shareRate: null, isPaid: false };
    const tripCurrency = currentTrip?.currency || "CLP";
    const origCurrency = e.currencyOrig || "CLP";
    const totalClp = e.amount || 0;

    // Show total and original currency
    document.getElementById("share-total-display").textContent = formatAmount(
      totalClp,
      tripCurrency,
    );
    const origText =
      origCurrency !== "CLP"
        ? ` (${formatAmount(e.amountOrig || 0, origCurrency)})`
        : "";
    document.getElementById("share-orig-currency-display").textContent =
      origText;

    // Show currency selector only if original was EUR/USD
    const currencyGroup = document.getElementById("share-currency-group");
    if (origCurrency !== "CLP") {
      currencyGroup.style.display = "block";
      document.getElementById("share-currency-input").value = "CLP";
    } else {
      currencyGroup.style.display = "none";
    }

    // Load my current amount (NO modificar el título)
    const splitWith = e.splitWith || tripMembers.map((m) => m.uid);

    // Since we removed the amount input and label, we don't need to display it
    // Users will use the calculator to calculate their amount
    // Load paid status
    const isPaid =
      e.payments &&
      (e.payments[uid] === "claimed" || e.payments[uid] === "confirmed");
    _editingShare.isPaid = isPaid || false;
    updateSharePaidBtn();

    // Load breakdown of other members
    renderShareBreakdown(uid, e, splitWith);

    // Initialize calculator and receipt viewer
    initializeCalculator();

    openModal("edit-share-modal");
  } catch (err) {
    toast("Error abriendo modal");
  }
}

function updateSharePaidBtn() {
  const btn = document.getElementById("share-paid-btn");
  if (_editingShare.isPaid) {
    btn.className = "btn";
    btn.style.width = "100%";
    btn.style.border = "2px solid rgba(124,239,176,0.5)";
    btn.style.padding = "12px";
    btn.style.fontWeight = "600";
    btn.style.borderRadius = "var(--radius-sm)";
    btn.style.background = "rgba(124,239,176,0.1)";
    btn.style.color = "var(--accent3)";
    btn.innerHTML =
      '<span style="font-size:1.2rem;margin-right:8px">✓</span> Pagado';
  } else {
    btn.className = "btn btn-ghost";
    btn.style.width = "100%";
    btn.style.border = "2px solid var(--border)";
    btn.style.padding = "12px";
    btn.style.fontWeight = "600";
    btn.style.borderRadius = "var(--radius-sm)";
    btn.innerHTML =
      '<span style="font-size:1.2rem;margin-right:8px">○</span> Pendiente de pago';
  }
}

window.toggleSharePaidBtn = function () {
  _editingShare.isPaid = !_editingShare.isPaid;
  updateSharePaidBtn();
};

function renderShareBreakdown(currentUid, expense, splitWith) {
  const breakdownList = document.getElementById("share-breakdown-list");
  const items = splitWith
    .map((uid) => {
      const member = tripMembers.find((m) => m.uid === uid);
      const name = member ? member.name : uid;
      const amt =
        expense.splitAmounts && expense.splitAmounts[uid]
          ? expense.splitAmounts[uid]
          : null;
      const tripCurrency = currentTrip?.currency || "CLP";
      const status = expense.payments && expense.payments[uid];

      // Usar el monto asignado directamente
      let displayAmount = amt;

      let amtDisplay = displayAmount
        ? formatAmount(displayAmount, tripCurrency)
        : "—";
      let statusEmoji = !displayAmount
        ? "⏳"
        : status === "confirmed"
          ? "✓"
          : status === "claimed"
            ? "🕐"
            : "○";

      let displayText = `${statusEmoji} ${name}`;
      if (uid === currentUid) {
        displayText = `<strong>👤 ${name}</strong> (tú)`;
      }

      return `<div style="padding:8px 10px;background:var(--surface2);border:1px solid var(--border);border-radius:8px;font-size:0.82rem;display:flex;justify-content:space-between;align-items:center"><span style="text-align:left">${displayText}</span><span style="color:var(--text);font-weight:600">${amtDisplay}</span></div>`;
    })
    .join("");
  breakdownList.innerHTML = items;
}

window.onShareAmountInput = async function () {
  const expense = _editingShare.expense;
  if (!expense) return;

  // Since we removed the amount input, this function is now just a placeholder
  // The validation is no longer needed as users use the calculator
  return;
};

async function saveShareEdit() {
  const { expId, uid, expense, isPaid } = _editingShare;
  if (!expId || !uid || !expense) return closeModal("edit-share-modal");

  // Use the calculator total as the amount
  const myAmtCLP = Math.round(calculatorTotal);

  const expRef = doc(db, "trips", currentTripId, "expenses", expId);
  const snap = await getDoc(expRef);
  if (!snap.exists()) return toast("Gasto no encontrado");
  const data = snap.data();
  const payments = { ...(data.payments || {}) };
  const splitAmounts = { ...(data.splitAmounts || {}) };

  // Update split amount for this user
  splitAmounts[uid] = myAmtCLP;

  // Update payments based on isPaid state
  if (isPaid) {
    payments[uid] = payments[uid] === "confirmed" ? "confirmed" : "claimed";
  } else {
    if (payments[uid] === "claimed") delete payments[uid];
  }

  await updateDoc(expRef, { splitAmounts, payments });

  toast("Tu parte fue guardada");
  closeModal("edit-share-modal");
}

// ─── CALCULATOR AND RECEIPT VIEWER FUNCTIONS ───

let calculatorTotal = 0;
let calculationHistory = [];
let receiptZoom = 1;
let receiptPanX = 0;
let receiptPanY = 0;
let isDragging = false;
let dragStartX = 0;
let dragStartY = 0;

// Calculator functions
function addToCalculator() {
  const input = document.getElementById("calc-input");
  const value = parseFloat(input.value) || 0;

  if (value > 0) {
    calculatorTotal += value;
    calculationHistory.push(`+${formatAmount(value, "CLP")}`);
    updateCalculatorDisplay();
    showOperationIndicator("+");
    input.value = "";
    input.focus();
  }
}

function subtractFromCalculator() {
  const input = document.getElementById("calc-input");
  const value = parseFloat(input.value) || 0;

  if (value > 0) {
    calculatorTotal -= value;
    calculationHistory.push(`-${formatAmount(value, "CLP")}`);
    updateCalculatorDisplay();
    showOperationIndicator("−");
    input.value = "";
    input.focus();
  }
}

function calculatePercentage() {
  const percentInput = document.getElementById("calc-percent-input");
  const percent = parseFloat(percentInput.value) || 0;

  if (percent > 0 && calculatorTotal > 0) {
    const percentageAmount = calculatorTotal * (percent / 100);
    calculatorTotal += percentageAmount;
    calculationHistory.push(
      `+${percent}% (${formatAmount(percentageAmount, "CLP")})`,
    );
    updateCalculatorDisplay();
    showOperationIndicator("+%");
    percentInput.value = "";
    percentInput.focus();
    toast(
      `${percent}% agregado: +${formatAmount(percentageAmount, "CLP")}`,
      "success",
    );
  }
}

function showOperationIndicator(operation) {
  const indicator = document.getElementById("calc-operation");
  const total = document.getElementById("calc-total");

  // Remove all classes
  indicator.classList.remove("show", "add", "subtract");
  total.classList.remove("pulse");

  // Force reflow to restart animation
  void total.offsetWidth;

  // Add appropriate classes
  if (operation === "+") {
    indicator.textContent = "+";
    indicator.classList.add("add");
  } else if (operation === "−") {
    indicator.textContent = "−";
    indicator.classList.add("subtract");
  } else if (operation === "+%") {
    indicator.textContent = "+%";
    indicator.classList.add("add");
  }

  indicator.classList.add("show");
  total.classList.add("pulse");

  // Hide indicator after animation
  setTimeout(() => {
    indicator.classList.remove("show");
  }, 800);

  // Remove pulse class after animation
  setTimeout(() => {
    total.classList.remove("pulse");
  }, 400);
}

function clearCalculator() {
  calculatorTotal = 0;
  calculationHistory = [];
  updateCalculatorDisplay();
  document.getElementById("calc-input").value = "";
  document.getElementById("calc-input").focus();
}

function assignCalcToAmount() {
  // Since we removed the amount input field, just show a toast with the calculated amount
  toast(`Total calculado: ${formatAmount(calculatorTotal, "CLP")}`, "success");
}

function updateCalculatorDisplay() {
  const totalDisplay = document.getElementById("calc-total");
  const historyDisplay = document.getElementById("calc-history");

  totalDisplay.textContent = formatAmount(calculatorTotal, "CLP");

  if (calculationHistory.length > 0) {
    historyDisplay.innerHTML =
      calculationHistory.slice(-5).join(" • ") +
      " = " +
      formatAmount(calculatorTotal, "CLP");
  } else {
    historyDisplay.innerHTML =
      '<span style="color:var(--text3)">Sin cálculos aún</span>';
  }
}

// Receipt zoom and pan functions
function updateReceiptTransform() {
  const img = document.getElementById("receipt-image");
  img.style.transform = `translate(${receiptPanX}px, ${receiptPanY}px) scale(${receiptZoom})`;

  // Update cursor classes
  img.classList.toggle("zoomed", receiptZoom > 1);
  if (!isDragging) {
    img.classList.toggle("dragging", false);
  }
}

function zoomReceipt(delta, centerX = null, centerY = null) {
  const img = document.getElementById("receipt-image");
  const rect = img.getBoundingClientRect();

  // If no center provided, use image center
  const x = centerX !== null ? centerX : rect.left + rect.width / 2;
  const y = centerY !== null ? centerY : rect.top + rect.height / 2;

  // Convert cursor position to image coordinates (accounting for current zoom and pan)
  const cursorX = (x - rect.left - receiptPanX) / receiptZoom;
  const cursorY = (y - rect.top - receiptPanY) / receiptZoom;

  // Update zoom
  const newZoom = Math.max(0.5, Math.min(3, receiptZoom + delta));

  // Calculate new pan to keep the cursor position fixed
  receiptPanX = x - rect.left - cursorX * newZoom;
  receiptPanY = y - rect.top - cursorY * newZoom;
  receiptZoom = newZoom;

  updateReceiptTransform();
}

function resetZoom() {
  receiptZoom = 1;
  receiptPanX = 0;
  receiptPanY = 0;
  updateReceiptTransform();
}

function startPan(x, y) {
  isDragging = true;
  dragStartX = x - receiptPanX;
  dragStartY = y - receiptPanY;
  const img = document.getElementById("receipt-image");
  img.classList.add("dragging");
}

function pan(x, y) {
  if (isDragging) {
    receiptPanX = x - dragStartX;
    receiptPanY = y - dragStartY;
    updateReceiptTransform();
  }
}

function endPan() {
  isDragging = false;
  const img = document.getElementById("receipt-image");
  img.classList.remove("dragging");
  updateReceiptTransform();
}

// Initialize calculator when modal opens
function initializeCalculator() {
  calculatorTotal = 0;
  calculationHistory = [];
  updateCalculatorDisplay();
  receiptZoom = 1;
  receiptPanX = 0;
  receiptPanY = 0;

  // Check if expense has receipt image
  const expense = _editingShare?.expense;
  if (expense && expense.receiptUrl) {
    const viewer = document.getElementById("receipt-viewer");
    const img = document.getElementById("receipt-image");

    img.src = expense.receiptUrl;
    viewer.style.display = "block";

    // Mouse events for desktop
    img.addEventListener("mousedown", (e) => {
      if (e.button === 0) {
        // Left click only
        e.preventDefault();
        startPan(e.clientX, e.clientY);
      }
    });

    img.addEventListener("mousemove", (e) => {
      pan(e.clientX, e.clientY);
    });

    img.addEventListener("mouseup", (e) => {
      endPan();
    });

    img.addEventListener("mouseleave", (e) => {
      endPan();
    });

    // Mouse wheel zoom with debounce
    let zoomTimeout;
    img.addEventListener("wheel", (e) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.05 : 0.05;

      clearTimeout(zoomTimeout);
      zoomTimeout = setTimeout(() => {
        zoomReceipt(delta, e.clientX, e.clientY);
      }, 16);
    });

    // Touch events for mobile
    let touchStartDistance = 0;
    let lastTouchDistance = 0;

    img.addEventListener("touchstart", (e) => {
      if (e.touches.length === 1) {
        // Single touch - start panning
        e.preventDefault();
        startPan(e.touches[0].clientX, e.touches[0].clientY);
      } else if (e.touches.length === 2) {
        // Two fingers - prepare for zoom
        e.preventDefault();
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        touchStartDistance = Math.sqrt(dx * dx + dy * dy);
        lastTouchDistance = touchStartDistance;
        endPan(); // Stop panning when zoom starts
      }
    });

    img.addEventListener("touchmove", (e) => {
      e.preventDefault();

      if (e.touches.length === 1) {
        // Single touch - pan
        pan(e.touches[0].clientX, e.touches[0].clientY);
      } else if (e.touches.length === 2 && touchStartDistance > 0) {
        // Two fingers - zoom
        e.preventDefault();
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (lastTouchDistance > 0) {
          const scale = distance / lastTouchDistance;
          const centerX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
          const centerY = (e.touches[0].clientY + e.touches[1].clientY) / 2;

          // Calculate zoom delta
          const zoomDelta = (scale - 1) * 0.2;
          zoomReceipt(zoomDelta, centerX, centerY);
        }

        lastTouchDistance = distance;
      }
    });

    img.addEventListener("touchend", (e) => {
      endPan();
      touchStartDistance = 0;
      lastTouchDistance = 0;
    });

    // Prevent context menu on long press
    img.addEventListener("contextmenu", (e) => {
      e.preventDefault();
    });
  } else {
    document.getElementById("receipt-viewer").style.display = "none";
  }
}

// Add keyboard support for calculator
document.addEventListener("keydown", (e) => {
  const modal = document.getElementById("edit-share-modal");
  const calcInput = document.getElementById("calc-input");
  const percentInput = document.getElementById("calc-percent-input");

  // Only handle keys when modal is open
  if (!modal.classList.contains("show")) return;

  // Handle calc input shortcuts
  if (document.activeElement === calcInput) {
    if (e.key === "Enter") {
      e.preventDefault();
      addToCalculator();
    } else if (e.key === "+" || e.key === "=") {
      e.preventDefault();
      addToCalculator();
    } else if (e.key === "-" || e.key === "_") {
      e.preventDefault();
      subtractFromCalculator();
    } else if (e.key === "Escape" || e.key === "c" || e.key === "C") {
      e.preventDefault();
      clearCalculator();
    }
  }

  // Handle percent input shortcuts
  if (document.activeElement === percentInput) {
    if (e.key === "Enter") {
      e.preventDefault();
      calculatePercentage();
    }
  }

  // Tab navigation between inputs
  if (e.key === "Tab" && !e.shiftKey) {
    if (document.activeElement === calcInput) {
      e.preventDefault();
      percentInput.focus();
    } else if (document.activeElement === percentInput) {
      e.preventDefault();
      calcInput.focus();
    }
  } else if (e.key === "Tab" && e.shiftKey) {
    if (document.activeElement === percentInput) {
      e.preventDefault();
      calcInput.focus();
    } else if (document.activeElement === calcInput) {
      e.preventDefault();
      percentInput.focus();
    }
  }
});

window.openEditShareModal = openEditShareModal;
window.saveShareEdit = saveShareEdit;
window.addToCalculator = addToCalculator;
window.subtractFromCalculator = subtractFromCalculator;
window.clearCalculator = clearCalculator;
window.assignCalcToAmount = assignCalcToAmount;
window.calculatePercentage = calculatePercentage;
window.zoomReceipt = zoomReceipt;
window.resetZoom = resetZoom;

async function deleteExpense(expId) {
  const ok = await customConfirm({
    icon: "💸",
    title: "¿Eliminar gasto?",
    msg: "Este gasto se borrará y no se podrá recuperar.",
    okLabel: "Eliminar",
    okClass: "btn-danger",
  });
  if (!ok) return;
  await deleteDoc(doc(db, "trips", currentTripId, "expenses", expId));
  toast("Gasto eliminado");
}

// ─── CUSTOM CONFIRM ───
let _confirmResolve = null;
function customConfirm({
  icon = "⚠️",
  title = "¿Estás seguro?",
  msg = "",
  okLabel = "Confirmar",
  okClass = "btn-danger",
} = {}) {
  return new Promise((resolve) => {
    _confirmResolve = resolve;
    document.getElementById("confirm-icon").innerHTML = icon;
    document.getElementById("confirm-title").textContent = title;
    document.getElementById("confirm-msg").textContent = msg;
    const okBtn = document.getElementById("confirm-ok-btn");
    okBtn.textContent = okLabel;
    okBtn.className = "btn " + okClass;
    document.getElementById("confirm-overlay").classList.add("show");
  });
}
window.confirmResolve = function (val) {
  document.getElementById("confirm-overlay").classList.remove("show");
  if (_confirmResolve) {
    _confirmResolve(val);
    _confirmResolve = null;
  }
};

function openLightbox(url) {
  document.getElementById("lightbox-img").src = url;
  document.getElementById("lightbox").classList.add("show");
}
window.closeLightbox = function () {
  document.getElementById("lightbox").classList.remove("show");
};
window.openLightbox = openLightbox;

// ─── PROFILE ───
function openProfile() {
  document.getElementById("home-view").style.display = "none";
  document.getElementById("trip-view").style.display = "none";
  document.getElementById("profile-view").style.display = "block";
  document.getElementById("bottom-nav").style.display = "none";
  document.body.classList.remove("trip-view-active");

  // Reset scroll to top
  window.scrollTo(0, 0);
  document.getElementById("profile-view").scrollTop = 0;

  const u = currentUser;
  document.getElementById("pv-avatar").textContent = (u.displayName ||
    "?")[0].toUpperCase();
  document.getElementById("pv-name").textContent =
    u.displayName || "Sin nombre";
  document.getElementById("pv-email").textContent = u.email;
  loadBankAccounts();
}

async function loadBankAccounts() {
  const snap = await getDocs(
    collection(db, "users", currentUser.uid, "bankAccounts"),
  );
  const accounts = [];
  snap.forEach((d) => accounts.push({ id: d.id, ...d.data() }));
  const container = document.getElementById("bank-cards-list");
  if (!accounts.length) {
    container.innerHTML =
      '<p style="color:var(--text3);font-size:0.88rem;margin-bottom:12px">Sin cuentas bancarias aún</p>';
    return;
  }
  container.innerHTML = accounts
    .map((a) => {
      const clipText = `Nombre: ${a.holder}\nRUT: ${a.rut}\nBanco: ${a.bank}\nTipo de cuenta: ${a.type}\nNúmero de cuenta: ${a.number}`;
      return `<div class="bank-card"><div class="bank-card-header"><div class="bank-card-bank">🏦 ${a.bank}</div><button class="btn btn-danger btn-sm" onclick="deleteBankAccount('${a.id}')">Eliminar</button></div>
        <div class="bank-card-grid">
          <div class="bank-card-field"><div class="field-label">Titular</div><div class="field-value">${a.holder}</div></div>
          <div class="bank-card-field"><div class="field-label">RUT</div><div class="field-value">${a.rut}</div></div>
          <div class="bank-card-field"><div class="field-label">Tipo</div><div class="field-value">${a.type}</div></div>
          <div class="bank-card-field"><div class="field-label">N° Cuenta</div><div class="field-value">${a.number}</div></div>
        </div>
        <button class="btn btn-ghost btn-sm" style="width:100%;margin-top:10px" data-clip="${clipText.replace(/"/g, "&quot;")}" onclick="copyBankData(this,this.dataset.clip)">📋 Copiar mis datos para compartir</button></div>`;
    })
    .join("");
}

async function saveBankAccount() {
  const bank = document.getElementById("bank-name").value;
  const type = document.getElementById("bank-type").value;
  const number = document.getElementById("bank-number").value.trim();
  const rut = document.getElementById("bank-rut").value.trim();
  const holder = document.getElementById("bank-holder").value.trim();
  if (!bank) return toast("Selecciona un banco");
  if (!number) return toast("Ingresa el número de cuenta");
  await addDoc(collection(db, "users", currentUser.uid, "bankAccounts"), {
    bank,
    type,
    number,
    rut,
    holder,
  });
  closeModal("bank-modal");
  toast("Cuenta guardada ✓");
  loadBankAccounts();
}

window.deleteBankAccount = async function (id) {
  const ok = await customConfirm({
    icon: "💳",
    title: "¿Eliminar cuenta?",
    msg: "Se borrará esta cuenta bancaria de tu perfil.",
    okLabel: "Eliminar",
    okClass: "btn-danger",
  });
  if (!ok) return;
  await deleteDoc(doc(db, "users", currentUser.uid, "bankAccounts", id));
  toast("Cuenta eliminada");
  loadBankAccounts();
};

// ─── PAY INFO MODAL ───
async function openPayModal(payerUid) {
  const member = tripMembers.find((m) => m.uid === payerUid);
  const name = member ? member.name.split(" ")[0] : "Pagador";
  document.getElementById("pay-modal-title").textContent =
    "💳 Datos de " + name;
  document.getElementById("pay-modal-content").innerHTML =
    '<p style="color:var(--text2)">Cargando...</p>';
  openModal("pay-info-modal");
  const snap = await getDocs(collection(db, "users", payerUid, "bankAccounts"));
  const accounts = [];
  snap.forEach((d) => accounts.push(d.data()));
  const box = document.getElementById("pay-modal-content");
  if (!accounts.length) {
    box.innerHTML =
      '<div style="text-align:center;padding:24px 0"><div style="font-size:2.5rem;margin-bottom:8px">🏦</div><p style="color:var(--text2)">Esta persona no tiene datos bancarios registrados aún</p></div>';
    return;
  }
  box.innerHTML = accounts
    .map((a, idx) => {
      const clipText = `Nombre: ${a.holder}\nRUT: ${a.rut}\nBanco: ${a.bank}\nTipo de cuenta: ${a.type}\nNúmero de cuenta: ${a.number}`;
      return `<div style="margin-bottom:${accounts.length > 1 ? "16px" : "0"}">
          <div style="font-weight:700;margin-bottom:10px;color:var(--accent);font-size:0.95rem">🏦 ${a.bank}</div>
          <div class="pay-info-row"><span class="key">Titular</span><span class="val">${a.holder}</span></div>
          <div class="pay-info-row"><span class="key">RUT</span><span class="val">${a.rut}</span></div>
          <div class="pay-info-row"><span class="key">Tipo</span><span class="val">${a.type}</span></div>
          <div class="pay-info-row"><span class="key">N° Cuenta</span><span class="val">${a.number}</span></div>
          <button class="btn btn-primary btn-sm" style="width:100%;margin-top:12px" data-clip="${clipText.replace(/"/g, "&quot;")}" onclick="copyBankData(this,this.dataset.clip)">📋 Copiar datos para transferir</button>
        </div>${idx < accounts.length - 1 ? '<hr style="border:none;border-top:1px solid var(--border);margin:12px 0">' : ""}`;
    })
    .join("");
}

window.copyBankData = function (btn, text) {
  navigator.clipboard
    .writeText(text)
    .then(() => {
      const original = btn.innerHTML;
      btn.innerHTML = "✅ ¡Copiado! Pega en tu app del banco";
      btn.style.background = "rgba(124,239,176,0.2)";
      btn.style.color = "var(--accent3)";
      btn.style.border = "1px solid rgba(124,239,176,0.3)";
      setTimeout(() => {
        btn.innerHTML = original;
        btn.style.background = "";
        btn.style.color = "";
        btn.style.border = "";
      }, 2500);
    })
    .catch(() => {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      btn.innerHTML = "✅ ¡Copiado!";
      setTimeout(() => {
        btn.innerHTML = "📋 Copiar datos para transferir";
      }, 2000);
    });
};

// ─── DASHBOARD ───
// Categorías que se agrupan como "Transporte" en el dashboard
const TRANSPORT_CATS = new Set(["Vuelo", "Auto", "Tren"]);

// Devuelve el nombre de categoría para el dashboard (agrupa transporte)
function dashCat(cat) {
  return TRANSPORT_CATS.has(cat) ? "Transporte" : cat || "Otro";
}

async function renderDashboard() {
  const q = query(collection(db, "trips", currentTripId, "expenses"));
  const snap = await getDocs(q);
  const expenses = [];
  snap.forEach((d) => expenses.push({ id: d.id, ...d.data() }));

  const sharedExpenses = expenses.filter((e) => e.type === "shared");
  const personalExpenses = expenses.filter(
    (e) => e.type === "personal" && e.createdBy === currentUser.uid,
  );
  const currency = currentTrip?.currency || "CLP";

  // Colores por categoría del dashboard (Transporte reemplaza Vuelo/Auto/Tren)
  const catColors = {
    Alojamiento: "#5b8cf7",
    Transporte: "#e8c97a", // agrupa Vuelo + Auto + Tren
    Comida: "#7cefb0",
    Actividades: "#f07878",
    Compras: "#b07cef",
    Entretenimiento: "#ef9b7c",
    Salud: "#7cd4ef",
    Otro: "#8a8fa3",
  };

  const totalShared = sharedExpenses.reduce((s, e) => s + (e.amount || 0), 0);

  // ── KPI "Mi gasto real": lo que me toca en compartidos (según splitWith) + mis personales ──
  let mySharedPortion = 0;
  sharedExpenses.forEach((e) => {
    const splitWith = e.splitWith || tripMembers.map((m) => m.uid);
    if (splitWith.includes(currentUser.uid)) {
      mySharedPortion += e.amount / splitWith.length;
    }
  });
  const myPersonalTotal = personalExpenses.reduce(
    (s, e) => s + (e.amount || 0),
    0,
  );
  const myTotal = Math.round(mySharedPortion + myPersonalTotal);

  // ── KPIs ──
  document.getElementById("kpi-total").textContent = formatAmount(
    totalShared,
    currency,
  );
  document.getElementById("kpi-expenses-count").textContent =
    `${sharedExpenses.length} gasto${sharedExpenses.length !== 1 ? "s" : ""}`;
  document.getElementById("kpi-per-person").textContent = formatAmount(
    myTotal,
    currency,
  );
  // Sub-label dinámico explicando la composición
  const subParts = [];
  if (mySharedPortion > 0)
    subParts.push(
      `compartidos: ${formatAmount(Math.round(mySharedPortion), currency)}`,
    );
  if (myPersonalTotal > 0)
    subParts.push(`personales: ${formatAmount(myPersonalTotal, currency)}`);
  document.getElementById("kpi-members-count").textContent = subParts.length
    ? subParts.join(" + ")
    : "sin gastos aún";

  // ── Category totals (agrupando Transporte) ──
  const catTotals = {};
  sharedExpenses.forEach((e) => {
    const cat = dashCat(e.category);
    // Icono: Transporte usa bus, los demás usan el ícono del gasto
    const icon = TRANSPORT_CATS.has(e.category) ? "🚌" : e.categoryIcon || "📦";
    if (!catTotals[cat]) catTotals[cat] = { amount: 0, icon };
    catTotals[cat].amount += e.amount;
  });
  const sortedCats = Object.entries(catTotals).sort(
    (a, b) => b[1].amount - a[1].amount,
  );

  if (sortedCats.length > 0) {
    const topCat = sortedCats[0];
    const pct =
      totalShared > 0 ? Math.round((topCat[1].amount / totalShared) * 100) : 0;
    document.getElementById("kpi-top-cat").textContent =
      topCat[1].icon + " " + topCat[0];
    document.getElementById("kpi-top-cat-pct").textContent =
      pct + "% del total";
  } else {
    document.getElementById("kpi-top-cat").textContent = "—";
    document.getElementById("kpi-top-cat-pct").textContent = "";
  }

  // ── DONUT CHART (SVG) ──
  const donutSvg = document.getElementById("donut-svg");
  const legend = document.getElementById("donut-legend");

  if (sortedCats.length === 0) {
    legend.innerHTML =
      '<span style="color:var(--text3);font-size:0.8rem">Sin datos aún</span>';
  } else {
    const r = 38,
      cx = 50,
      cy = 50,
      stroke = 18;
    const circumference = 2 * Math.PI * r;
    let offset = 0;
    let segmentsHtml = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#1f2535" stroke-width="${stroke}"/>`;

    sortedCats.forEach(([cat, data]) => {
      const pct = totalShared > 0 ? data.amount / totalShared : 0;
      const dashLen = pct * circumference;
      const color = catColors[cat] || "#8a8fa3";
      segmentsHtml += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${color}" stroke-width="${stroke}"
            stroke-dasharray="${dashLen} ${circumference - dashLen}"
            stroke-dashoffset="${-offset}"
            transform="rotate(-90 ${cx} ${cy})"
            style="transition:stroke-dasharray 0.8s ease">
            <title>${cat}: ${Math.round(pct * 100)}%</title>
          </circle>`;
      offset += dashLen;
    });

    segmentsHtml += `<text x="${cx}" y="${cy - 3}" text-anchor="middle" class="donut-center">${sharedExpenses.length}</text>`;
    segmentsHtml += `<text x="${cx}" y="${cy + 8}" text-anchor="middle" class="donut-center-sub">gastos</text>`;
    donutSvg.innerHTML = segmentsHtml;

    legend.innerHTML = sortedCats
      .slice(0, 6)
      .map(([cat, data]) => {
        const pct =
          totalShared > 0 ? Math.round((data.amount / totalShared) * 100) : 0;
        const color = catColors[cat] || "#8a8fa3";
        return `<div class="donut-legend-item">
            <div class="donut-legend-dot" style="background:${color}"></div>
            <span style="overflow:hidden;text-overflow:ellipsis">${data.icon} ${cat}</span>
            <span class="donut-legend-pct">${pct}%</span>
          </div>`;
      })
      .join("");
  }

  // ── MEMBER BAR CHART (gasto real por persona según splitWith) ──
  const memberSpend = {};
  tripMembers.forEach((m) => {
    memberSpend[m.uid] = 0;
  });
  sharedExpenses.forEach((e) => {
    const splitWith = e.splitWith || tripMembers.map((m) => m.uid);
    splitWith.forEach((uid) => {
      if (memberSpend[uid] !== undefined)
        memberSpend[uid] += e.amount / splitWith.length;
    });
  });
  const maxSpend = Math.max(...Object.values(memberSpend), 1);
  const memberBarsEl = document.getElementById("member-bars");
  const memberColors = [
    "#5b8cf7",
    "#e8c97a",
    "#7cefb0",
    "#f07878",
    "#b07cef",
    "#f0a050",
  ];
  memberBarsEl.innerHTML = tripMembers
    .map((m, idx) => {
      const spend = memberSpend[m.uid] || 0;
      const pct = (spend / maxSpend) * 100;
      const color = memberColors[idx % memberColors.length];
      const isMe = m.uid === currentUser.uid;
      return `<div class="member-bar-row">
          <div class="member-bar-info">
            <span class="member-bar-name">${m.name.split(" ")[0]}${isMe ? ' <span style="font-size:0.7rem;color:var(--accent2)">(tú)</span>' : ""}</span>
            <span class="member-bar-amount">${formatAmount(spend, currency)}</span>
          </div>
          <div class="member-bar-track">
            <div class="member-bar-fill" style="width:${pct}%;background:${color}"></div>
          </div>
        </div>`;
    })
    .join("");

  // -- CATEGORY BREAKDOWN --
  const catBreakdownEl = document.getElementById("cat-breakdown");
  if (!sortedCats.length) {
    catBreakdownEl.innerHTML =
      '<span style="color:var(--text3);font-size:0.85rem">Sin datos aun</span>';
  } else {
    const maxCatAmount = sortedCats[0][1].amount;
    catBreakdownEl.innerHTML = sortedCats
      .map(([cat, data]) => {
        const pct =
          totalShared > 0 ? Math.round((data.amount / totalShared) * 100) : 0;
        const barPct = (data.amount / maxCatAmount) * 100;
        const color = catColors[cat] || "#8a8fa3";
        return `<div class="member-bar-row" style="margin-bottom:10px">
            <div class="member-bar-info">
              <span class="member-bar-name" style="display:flex;align-items:center;gap:6px">
                <span style="font-size:1rem">${data.icon}</span> ${cat}
              </span>
              <span style="display:flex;align-items:center;gap:8px">
                <span style="font-size:0.75rem;color:var(--text3);font-weight:500">${pct}%</span>
                <span class="member-bar-amount">${formatAmount(data.amount, currency)}</span>
              </span>
            </div>
            <div class="member-bar-track">
              <div class="member-bar-fill" style="width:${barPct}%;background:${color}"></div>
            </div>
          </div>`;
      })
      .join("");
  }

  // ── RECENT ACTIVITY ──
  const recent = [...sharedExpenses]
    .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
    .slice(0, 5);
  const activityEl = document.getElementById("activity-list");
  if (!recent.length) {
    activityEl.innerHTML =
      '<span style="color:var(--text3);font-size:0.85rem">Sin actividad aún</span>';
  } else {
    activityEl.innerHTML = recent
      .map((e) => {
        const paidByMember = tripMembers.find((m) => m.uid === e.paidBy);
        const paidByName = paidByMember
          ? paidByMember.name.split(" ")[0]
          : "Alguien";
        const color = catColors[e.category] || "#5b8cf7";
        const catIconsMap = { Alojamiento: "🏠", Vuelo: "✈️", Auto: "🚗", Tren: "🚂", Comida: "🍽️", Actividades: "🎯", Compras: "🛍️", Entretenimiento: "🎉", Salud: "💊", Otro: "📦" };
        const icon = e.icon || catIconsMap[e.category] || "📦";
        return `<div class="activity-item">
            <div class="activity-icon" style="background:${color}22;color:${color}">${icon}</div>
            <div class="activity-content">
              <strong>${e.description}</strong> · pagado por ${paidByName}
              ${e.date ? `<div style="font-size:0.76rem;color:var(--text3);margin-top:2px">${formatDate(e.date)}</div>` : ""}
            </div>
            <div class="activity-amount">${formatAmount(e.amount, currency)}</div>
          </div>`;
      })
      .join("");
  }

  // ── BALANCE MATH (same as original) ──
  const paid = {};
  const owes = {};
  const displayPaid = {};
  tripMembers.forEach((m) => {
    paid[m.uid] = 0;
    owes[m.uid] = 0;
    displayPaid[m.uid] = 0;
  });
  const debts = {};
  tripMembers.forEach((m) => {
    debts[m.uid] = {};
    tripMembers.forEach((n) => {
      debts[m.uid][n.uid] = 0;
    });
  });

  sharedExpenses.forEach((e) => {
    const splitWith = e.splitWith || tripMembers.map((m) => m.uid);
    if (paid[e.paidBy] !== undefined) {
      paid[e.paidBy] += e.amount;
      displayPaid[e.paidBy] += e.amount;
    }
    splitWith.forEach((uid) => {
      // Usar splitAmounts si existe (division personalizada), sino division igual
      const perP =
        e.splitMode === "custom" && e.splitAmounts?.[uid]
          ? e.splitAmounts[uid]
          : e.amount / splitWith.length;
      if (owes[uid] !== undefined) owes[uid] += perP;
      if (uid !== e.paidBy) {
        if (e.payments && e.payments[uid] === "confirmed") {
          if (paid[uid] !== undefined) paid[uid] += perP;
          if (paid[e.paidBy] !== undefined) paid[e.paidBy] -= perP;
        } else if (debts[uid] && debts[uid][e.paidBy] !== undefined) {
          debts[uid][e.paidBy] += perP;
        }
      }
    });
  });

  tripMembers.forEach((a) => {
    tripMembers.forEach((b) => {
      if (a.uid >= b.uid) return;
      const ab = debts[a.uid][b.uid] || 0;
      const ba = debts[b.uid][a.uid] || 0;
      if (ab > ba) {
        debts[a.uid][b.uid] = ab - ba;
        debts[b.uid][a.uid] = 0;
      } else {
        debts[b.uid][a.uid] = ba - ab;
        debts[a.uid][b.uid] = 0;
      }
    });
  });

  const net = {};
  tripMembers.forEach((m) => {
    net[m.uid] = paid[m.uid] - owes[m.uid];
  });

  document.getElementById("balance-list").innerHTML = tripMembers
    .map((m) => {
      const n = net[m.uid] || 0;
      const cls =
        n > 0
          ? "balance-positive"
          : n < 0
            ? "balance-negative"
            : "balance-neutral";
      const label = n > 0 ? "Le deben" : n < 0 ? "Debe" : "Al día ✓";
      const avatarContent = window.memberPhotoUrls[m.uid]
        ? `<img src="${window.memberPhotoUrls[m.uid]}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`
        : (m.name || "?")[0].toUpperCase();

      return `<div class="balance-person">
          <div class="balance-left">
            <div class="avatar avatar-lg">${avatarContent}</div>
            <div>
              <div style="font-weight:600">${m.name}</div>
              <div style="font-size:0.82rem;color:var(--text2)">Pagó ${formatAmount(displayPaid[m.uid] || 0, currency)}</div>
            </div>
          </div>
          <div style="text-align:right">
            <div class="balance-amount ${cls}">${n > 0 ? "+" : ""}${formatAmount(n, currency)}</div>
            <div style="font-size:0.78rem;color:var(--text3)">${label}</div>
          </div>
        </div>`;
    })
    .join("");

  const transactions = [];
  tripMembers.forEach((from) => {
    tripMembers.forEach((to) => {
      const amt = debts[from.uid]?.[to.uid] || 0;
      if (amt > 1)
        transactions.push({
          from: from.name,
          to: to.name,
          fromUid: from.uid,
          toUid: to.uid,
          amount: amt,
        });
    });
  });

  document.getElementById("owed-list").innerHTML = !transactions.length
    ? '<p style="color:var(--accent3);font-size:0.9rem;padding:12px 0">🎉 ¡Todos están al día!</p>'
    : transactions
      .map(
        (t) => `<div class="debt-row">
            <div class="avatar" style="width:28px;height:28px;font-size:0.75rem">${t.from[0]}</div>
            <div style="flex:1"><strong>${t.from.split(" ")[0]}</strong> <span style="color:var(--text3)">debe a</span> <strong>${t.to.split(" ")[0]}</strong></div>
            <div class="debt-amount">${formatAmount(t.amount, currency)}</div>
          </div>`,
      )
      .join("");
}

// ─── NOTES ───
function subscribeNotes() {
  if (unsubscribeNotes) unsubscribeNotes();
  const q = query(collection(db, "trips", currentTripId, "notes"));
  unsubscribeNotes = onSnapshot(q, (snap) => {
    const notes = [];
    snap.forEach((d) => notes.push({ id: d.id, ...d.data() }));
    notes.sort(
      (a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0),
    );
    const container = document.getElementById("notes-list");
    if (!notes.length) {
      container.innerHTML = `<div class="empty-state"><div class="empty-icon">📝</div><p>Sin notas aún</p></div>`;
      return;
    }
    container.innerHTML = notes
      .map(
        (n) => `
          <div class="note-card">
            <div class="note-author">
              <div class="avatar mavatar-${n.authorId}" style="width:28px;height:28px;font-size:0.75rem">${window.memberPhotoUrls[n.authorId] ? `<img src="${window.memberPhotoUrls[n.authorId]}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">` : (n.authorName || "?")[0].toUpperCase()}</div>
              <strong style="font-size:0.9rem">${n.authorName}</strong>
              <span class="text-muted">${n.date || ""}</span>
            </div>
            <p style="font-size:0.95rem;line-height:1.6;color:var(--text)">${n.content}</p>
          </div>
        `,
      )
      .join("");
  });
}

async function addNote() {
  const content = document.getElementById("note-input").value.trim();
  if (!content) return;
  await addDoc(collection(db, "trips", currentTripId, "notes"), {
    content,
    authorId: currentUser.uid,
    authorName: currentUser.displayName || currentUser.email,
    date: new Date().toLocaleDateString("es-CL"),
    createdAt: serverTimestamp(),
  });
  document.getElementById("note-input").value = "";
  toast("Nota publicada ✓");
}

// ─── ITINERARY ───
function getDaysBetween(startDate, endDate) {
  if (!startDate) return [];
  const days = [];
  const start = new Date(startDate + "T00:00:00");
  const end = endDate ? new Date(endDate + "T00:00:00") : start;
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    days.push(d.toISOString().split("T")[0]);
  }
  return days;
}

function subscribeItinerary() {
  if (unsubscribeItinerary) unsubscribeItinerary();
  const q = collection(db, "trips", currentTripId, "itinerary");
  unsubscribeItinerary = onSnapshot(q, (snap) => {
    const events = [];
    snap.forEach((d) => events.push({ id: d.id, ...d.data() }));
    window._itinEvents = events;
    renderItinerary();
  });
}

function renderItinerary(resetPagination) {
  if (!currentTrip) return;
  if (resetPagination) itinVisibleDays = 5;
  const allDays = getDaysBetween(currentTrip.startDate, currentTrip.endDate);
  const events = window._itinEvents || [];
  const container = document.getElementById("itin-days-list");
  const progressWrap = document.getElementById("itin-progress-wrap");

  if (!allDays.length) {
    container.innerHTML = `<div class="itin-empty"><div class="itin-empty-icon">📅</div><p>El viaje no tiene fechas definidas</p><small>Edita el viaje para agregar fechas de inicio y fin</small></div>`;
    progressWrap.style.display = "none";
    document.getElementById("itin-controls").style.display = "none";
    return;
  }

  // Progress: which day are we on today
  const today = new Date().toISOString().split("T")[0];
  const passedDays = allDays.filter((d) => d <= today).length;
  const totalDays = allDays.length;
  const pct = Math.min(100, Math.round((passedDays / totalDays) * 100));
  progressWrap.style.display = "";
  document.getElementById("itin-controls").style.display = "flex";
  document.getElementById("itin-progress-fill").style.width = pct + "%";
  document.getElementById("itin-progress-label").textContent =
    `Día ${Math.min(passedDays, totalDays)} de ${totalDays}`;

  // Smart start: begin from today if within trip, otherwise from first day
  let startIdx = 0;
  const todayIdx = allDays.indexOf(today);
  if (todayIdx > 0) startIdx = todayIdx;

  // Slice visible window
  const visibleDays = allDays.slice(startIdx, startIdx + itinVisibleDays);
  const hasMore = startIdx + itinVisibleDays < allDays.length;
  const hasPrev = startIdx > 0;

  const months = [
    "Ene",
    "Feb",
    "Mar",
    "Abr",
    "May",
    "Jun",
    "Jul",
    "Ago",
    "Sep",
    "Oct",
    "Nov",
    "Dic",
  ];
  const weekDays = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

  const daysHtml = visibleDays
    .map((dateStr, i) => {
      const idx = allDays.indexOf(dateStr);
      const dayEvents = events
        .filter((e) => e.date === dateStr)
        .sort((a, b) =>
          (a.timeStart || "00:00").localeCompare(b.timeStart || "00:00"),
        );
      const d = new Date(dateStr + "T12:00:00");
      const dayLabel = `Día ${idx + 1}`;
      const dateLabel = `${weekDays[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]}`;
      const isToday = dateStr === today;
      const isPast = dateStr < today;
      const eventsHtml = dayEvents
        .map((ev) => renderItinEventCard(ev))
        .join("");

      const isCollapsed = window._itinInitiallyCollapsed;

      return `<div class="itin-day-block ${isCollapsed ? 'collapsed' : ''}" id="itin-day-${dateStr}">
          <div class="itin-day-header" onclick="toggleItinDay('${dateStr}')">
            <div class="itin-day-header-left">
              <span class="itin-day-badge" style="${isToday ? "background:linear-gradient(135deg,var(--accent3),var(--accent2))" : isPast ? "background:var(--surface3);color:var(--text3)" : ""}">${dayLabel}</span>
              <div>
                <div class="itin-day-title">${dateLabel}${isToday ? ' <span style="color:var(--accent3);font-size:0.78rem;font-weight:600">● Hoy</span>' : ""}</div>
                <div class="itin-day-subtitle">${dayEvents.length ? `${dayEvents.length} actividad${dayEvents.length !== 1 ? "es" : ""}` : "Sin actividades aún"}</div>
              </div>
            </div>
            <span class="itin-day-chevron">▾</span>
          </div>
          <div class="itin-day-body" id="itin-day-body-${dateStr}" data-date="${dateStr}">
            ${eventsHtml || `<div style="text-align:center;padding:14px 0;color:var(--text3);font-size:0.82rem">Sin actividades programadas</div>`}
            
            <div style="display:flex; gap:8px; margin-top:12px;">
                <button class="itin-add-event-btn" style="flex:1" onclick="openAddItinEvent('${dateStr}')">+ Agregar actividad</button>
                <button class="btn-maps-export" onclick="window.open(getGoogleMapsDayLink(getDayRouteData('${dateStr}')), '_blank')">🗺️ Ruta en Maps</button>
            </div>
          </div>
        </div>`;
    })
    .join("");

  // Navigation buttons
  const prevHtml = hasPrev
    ? `
        <button class="itin-load-btn itin-load-prev" onclick="itinLoadPrev()">
          ↑ Ver días anteriores <span class="itin-load-count">(${startIdx} día${startIdx !== 1 ? "s" : ""})</span>
        </button>`
    : "";

  const remaining = allDays.length - (startIdx + itinVisibleDays);
  const nextHtml = hasMore
    ? `
        <button class="itin-load-btn itin-load-next" onclick="itinLoadMore()">
          Ver más días ↓ <span class="itin-load-count">(${remaining} día${remaining !== 1 ? "s" : ""} más)</span>
        </button>`
    : "";

  const doneHtml =
    !hasMore && totalDays > 5
      ? `
        <div style="text-align:center;padding:14px 0;color:var(--text3);font-size:0.82rem">
          ✓ Has visto todos los días del viaje
        </div>`
      : "";

  container.innerHTML = prevHtml + daysHtml + nextHtml + doneHtml;

  // Inicializar mapa (si está visible) y SortableJS después de renderizar el DOM
  requestAnimationFrame(() => {
    // 1. Ocultar/Mostrar el botón toggle según si hay listado
    const mapToggleBtn = document.getElementById('show-map-btn-wrap');
    if (mapToggleBtn && document.getElementById('itinerary-map-container').style.display === 'none') {
      mapToggleBtn.style.display = 'block';
    }

    // 2. Preparar SIEMPRE la data con el mismo formato que espera updateMap (Trip > Itinerary > Items)
    if (window.currentTrip && events) {
      window.currentTrip.itinerary = allDays.map(dateStr => {
        return {
          date: dateStr,
          items: events.filter(e => e.date === dateStr)
            .sort((a, b) => (a.timeStart || "00:00").localeCompare(b.timeStart || "00:00"))
        };
      });
    }

    // 3. Actualizar el mapa solo si la función existe y el mapa ya está inicializado visualmente
    if (window.updateMap) {
      window.updateMap();
    }

    // 4. Inicializar Drag & Drop
    if (window.Sortable) {
      document.querySelectorAll('.itin-day-body').forEach(el => {
        // No inyectar Sortable si no hay items (está el placeholder vacío)
        if (el.querySelector('.itin-event')) {
          new Sortable(el, {
            group: 'itinerary-days',
            handle: '.itin-item-drag-handle',
            animation: 150,
            ghostClass: 'sortable-ghost',
            dragClass: 'sortable-drag',
            onEnd: async function (evt) {
              const itemEl = evt.item;
              const toDayContainer = evt.to;
              const toDateStr = toDayContainer.getAttribute('data-date');
              const eventId = itemEl.getAttribute('data-id');

              if (!toDateStr || !eventId) return;

              // Actualizar en base de datos la nueva fecha si cambió de día
              // o el nuevo orden (simplificado: basar en timeStart reescrito según posición).
              // Aquí idealmente hay un campo "order", pero como usa "timeStart" para sortear
              // mostraremos un toast de que el Drag & drop modificó el orden temporalmente
              // A un nivel más profesional se requeriría actualizar el campo "timeStart" en BD.

              try {
                // Solo si cambió de lista de día
                if (evt.from !== evt.to) {
                  const evRef = doc(db, "trips", currentTripId, "itinerary", eventId);
                  await updateDoc(evRef, { date: toDateStr });
                  toast("Día actualizado ✓");
                } else if (evt.oldIndex !== evt.newIndex) {
                  // Cambió orden en el mismo día (Requeriría lógica de reajuste de horario)
                  toast("Orden modificado. Revisa las horas.");
                }

              } catch (e) {
                console.error(e);
              }
            }
          });
        }
      });
    }
  });
}

// Función helper para exportar URL de Google Maps por día
window.getDayRouteData = function (dateStr) {
  const dayEvents = (window._itinEvents || [])
    .filter(e => e.date === dateStr)
    .sort((a, b) => (a.timeStart || "00:00").localeCompare(b.timeStart || "00:00"));

  return {
    date: dateStr,
    items: dayEvents
  };
}

function renderItinEventCard(ev) {
  const tagHtml = (ev.tags || [])
    .map((tag) => {
      const tagMap = {
        must: ["itin-tag-must", "⭐ Imperdible"],
        book: ["itin-tag-book", "📋 Reservar"],
        tip: ["itin-tag-tip", "💡 Dato útil"],
        free: ["itin-tag-free", "🆓 Gratis"],
        done: ["itin-tag-done", "✅ Reservado"],
      };
      const [cls, label] = tagMap[tag] || ["", tag];
      return `<span class="itin-tag ${cls}">${label}</span>`;
    })
    .join("");

  const timeLabel = ev.timeStart
    ? `<span>🕒 ${ev.timeStart}${ev.timeEnd ? " – " + ev.timeEnd : ""}</span>`
    : "";
  const locationLabel = ev.location ? `<span>📍 ${ev.location}</span>` : "";
  const mapsButton = ev.mapsUrl
    ? `<button class="itin-maps-btn" onclick="openGoogleMaps('${ev.mapsUrl.replace(/'/g, "\\'")}')">🗺️ Ver en Maps</button>`
    : "";
  const reservaBtn = ev.receiptUrl
    ? `<button class="itin-maps-btn" onclick="openLightbox('${ev.receiptUrl}')" style="background:rgba(124,239,176,0.12);color:var(--accent3);border-color:rgba(124,239,176,0.25)">📎 Ver reserva</button>`
    : "";
  const bookingBtn = ev.bookingUrl
    ? `<button class="itin-maps-btn" onclick="window.open('${ev.bookingUrl.replace(/'/g, "\\'")}','_blank')" style="background:rgba(91,140,247,0.12);color:var(--accent2);border-color:rgba(91,140,247,0.25)">🔗 Ver link</button>`
    : "";
  const noteHtml = ev.note
    ? `<div class="itin-event-note">💬 ${ev.note}</div>`
    : "";

  const itinIcons = { Visita: "🏛️", Comida: "🍽️", Alojamiento: "🏠", Vuelo: "✈️", Tren: "🚂", Auto: "🚗", Actividad: "🎯", Otro: "📌" };
  const evIcon = ev.icon || itinIcons[ev.category] || "📌";

  return `<div class="itin-event" data-id="${ev.id}">
        <div class="itin-item-drag-handle" title="Arrastrar para reordenar">☰</div>
        <div class="itin-timeline">
          <div class="itin-time">${ev.timeStart || "—"}</div>
          <div class="itin-time-line"></div>
        </div>
        <div class="itin-event-icon">${evIcon}</div>
        <div class="itin-event-body">
          <div class="itin-event-title">${ev.title}</div>
          <div class="itin-event-meta">${timeLabel}${locationLabel}</div>
          ${mapsButton || reservaBtn || bookingBtn ? `<div class="itin-event-maps" style="display:flex;flex-wrap:wrap;gap:6px">${mapsButton}${reservaBtn}${bookingBtn}</div>` : ""}
          ${noteHtml}
          ${tagHtml ? `<div class="itin-event-tags">${tagHtml}</div>` : ""}
        </div>
        <div class="itin-event-actions" style="position:relative">
          <button class="itin-action-btn" onclick="toggleItinKebab('${ev.id}', event)">⋮</button>
          <div id="itin-kebab-${ev.id}" style="display:none;position:absolute;top:100%;right:0;margin-top:4px;background:var(--surface2);border:1px solid var(--border);border-radius:10px;min-width:140px;z-index:9999;box-shadow:0 8px 32px rgba(0,0,0,0.7)">
            <div onclick="openEditItinEvent('${ev.id}','${ev.date}');closeItinKebab('${ev.id}')" style="padding:12px 16px;cursor:pointer;font-size:0.88rem;color:var(--text2)">✏️ Editar</div>
            <div onclick="deleteItinEvent('${ev.id}');closeItinKebab('${ev.id}')" style="padding:12px 16px;cursor:pointer;font-size:0.88rem;color:var(--danger)">🗑️ Eliminar</div>
          </div>
        </div>
      </div>`;
}

function toggleItinDay(dateStr) {
  document.getElementById("itin-day-" + dateStr)?.classList.toggle("collapsed");
}

function itinLoadMore() {
  itinVisibleDays += 5;
  renderItinerary();
}

function itinLoadPrev() {
  // Expand window to show from beginning
  const allDays = getDaysBetween(currentTrip?.startDate, currentTrip?.endDate);
  const today = new Date().toISOString().split("T")[0];
  const todayIdx = allDays.indexOf(today);
  const startIdx = todayIdx > 0 ? todayIdx : 0;
  // Increase visible days to cover all from 0 to current end
  itinVisibleDays = startIdx + itinVisibleDays;
  // Temporarily override startIdx by setting a flag — simpler: just show all from 0
  window._itinShowFromStart = true;
  renderItineraryFromStart();
}

function renderItineraryFromStart() {
  if (!currentTrip) return;
  const allDays = getDaysBetween(currentTrip.startDate, currentTrip.endDate);
  const events = window._itinEvents || [];
  const container = document.getElementById("itin-days-list");
  const today = new Date().toISOString().split("T")[0];
  const months = [
    "Ene",
    "Feb",
    "Mar",
    "Abr",
    "May",
    "Jun",
    "Jul",
    "Ago",
    "Sep",
    "Oct",
    "Nov",
    "Dic",
  ];
  const weekDays = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

  // Update progress
  const passedDays = allDays.filter((d) => d <= today).length;
  const totalDays = allDays.length;
  const pct = Math.min(100, Math.round((passedDays / totalDays) * 100));
  document.getElementById("itin-progress-fill").style.width = pct + "%";
  document.getElementById("itin-progress-label").textContent =
    `Día ${Math.min(passedDays, totalDays)} de ${totalDays}`;
  document.getElementById("itin-controls").style.display = "flex";

  const visibleDays = allDays.slice(0, itinVisibleDays);
  const hasMore = itinVisibleDays < allDays.length;
  const remaining = allDays.length - itinVisibleDays;

  const daysHtml = visibleDays
    .map((dateStr, idx) => {
      const dayEvents = events
        .filter((e) => e.date === dateStr)
        .sort((a, b) =>
          (a.timeStart || "00:00").localeCompare(b.timeStart || "00:00"),
        );
      const d = new Date(dateStr + "T12:00:00");
      const dayLabel = `Día ${idx + 1}`;
      const dateLabel = `${weekDays[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]}`;
      const isToday = dateStr === today;
      const isPast = dateStr < today;
      const eventsHtml = dayEvents
        .map((ev) => renderItinEventCard(ev))
        .join("");
      
      const isCollapsed = window._itinInitiallyCollapsed;

      return `<div class="itin-day-block ${isCollapsed ? 'collapsed' : ''}" id="itin-day-${dateStr}">
          <div class="itin-day-header" onclick="toggleItinDay('${dateStr}')">
            <div class="itin-day-header-left">
              <span class="itin-day-badge" style="${isToday ? "background:linear-gradient(135deg,var(--accent3),var(--accent2))" : isPast ? "background:var(--surface3);color:var(--text3)" : ""}">${dayLabel}</span>
              <div>
                <div class="itin-day-title">${dateLabel}${isToday ? ' <span style="color:var(--accent3);font-size:0.78rem;font-weight:600">● Hoy</span>' : ""}</div>
                <div class="itin-day-subtitle">${dayEvents.length ? `${dayEvents.length} actividad${dayEvents.length !== 1 ? "es" : ""}` : "Sin actividades aún"}</div>
              </div>
            </div>
            <span class="itin-day-chevron">▾</span>
          </div>
          <div class="itin-day-body" id="itin-day-body-${dateStr}" data-date="${dateStr}">
            ${eventsHtml || `<div style="text-align:center;padding:14px 0;color:var(--text3);font-size:0.82rem">Sin actividades programadas</div>`}
            
            <div style="display:flex; gap:8px; margin-top:12px;">
                <button class="itin-add-event-btn" style="flex:1" onclick="openAddItinEvent('${dateStr}')">+ Agregar actividad</button>
                <button class="btn-maps-export" onclick="window.open(getGoogleMapsDayLink(getDayRouteData('${dateStr}')), '_blank')">🗺️ Ruta en Maps</button>
            </div>
          </div>
        </div>`;
    })
    .join("");

  const nextHtml = hasMore
    ? `<button class="itin-load-btn itin-load-next" onclick="itinLoadMoreFromStart()">Ver más días ↓ <span class="itin-load-count">(${remaining} día${remaining !== 1 ? "s" : ""} más)</span></button>`
    : `<div style="text-align:center;padding:14px 0;color:var(--text3);font-size:0.82rem">✓ Has visto todos los días del viaje</div>`;
  container.innerHTML = daysHtml + nextHtml;
}

function itinLoadMoreFromStart() {
  itinVisibleDays += 5;
  renderItineraryFromStart();
}

function openAddItinEvent(dateStr) {
  editingItinEventId = null;
  editingItinDay = dateStr;
  document.getElementById("itin-modal-title").textContent =
    "Agregar actividad 🗓️";
  document.getElementById("itin-title").value = "";
  document.getElementById("itin-time-start").value = "09:00";
  document.getElementById("itin-time-end").value = "";
  document.getElementById("itin-location").value = "";
  document.getElementById("itin-maps-url").value = "";
  document.getElementById("itin-booking-url").value = "";
  document.getElementById("itin-receipt").value = "";
  document.getElementById("itin-file-name-display").textContent =
    "Seleccionar foto o comprobante...";
  document.getElementById("itin-receipt-label").classList.remove("has-file");
  document.getElementById("itin-receipt-preview-link").style.display = "none";
  window._itinDeleteReceipt = false;
  document.getElementById("itin-note").value = "";
  activeItinTags.clear();
  selectedItinCat = "Visita";
  selectedItinCatIcon = "🏛️";
  document
    .querySelectorAll("#itin-cat-grid .cat-btn")
    .forEach((b, i) => b.classList.toggle("selected", i === 0));
  ["must", "book", "tip", "free"].forEach((t) =>
    document.getElementById("itag-" + t)?.classList.remove("active"),
  );

  // If dateStr is null, show a date selector
  const dateRow = document.getElementById("itin-date-row");
  if (!dateStr) {
    if (dateRow) dateRow.style.display = "";
    const sel = document.getElementById("itin-day-select");
    if (sel) {
      const days = getDaysBetween(currentTrip?.startDate, currentTrip?.endDate);
      sel.innerHTML = days
        .map((d) => {
          const [y, m, dd] = d.split("-");
          const months = [
            "Ene",
            "Feb",
            "Mar",
            "Abr",
            "May",
            "Jun",
            "Jul",
            "Ago",
            "Sep",
            "Oct",
            "Nov",
            "Dic",
          ];
          return `<option value="${d}">${dd} ${months[parseInt(m) - 1]} ${y}</option>`;
        })
        .join("");
    }
  } else {
    if (dateRow) dateRow.style.display = "none";
  }
  openModal("add-itin-event-modal");
}

function openEditItinEvent(eventId, dateStr) {
  const ev = (window._itinEvents || []).find((e) => e.id === eventId);
  if (!ev) return;
  editingItinEventId = eventId;
  editingItinDay = ev.date || dateStr;
  document.getElementById("itin-modal-title").textContent =
    "Editar actividad ✏️";
  document.getElementById("itin-title").value = ev.title || "";
  document.getElementById("itin-time-start").value = ev.timeStart || "09:00";
  document.getElementById("itin-time-end").value = ev.timeEnd || "";
  document.getElementById("itin-location").value = ev.location || "";
  document.getElementById("itin-maps-url").value = ev.mapsUrl || "";
  document.getElementById("itin-booking-url").value = ev.bookingUrl || "";
  document.getElementById("itin-note").value = ev.note || "";
  selectedItinCat = ev.category || "Visita";
  selectedItinCatIcon = ev.icon || "📍";
  // Restore category selection
  document.querySelectorAll("#itin-cat-grid .cat-btn").forEach((b) => {
    b.classList.toggle(
      "selected",
      b.textContent.trim().includes(ev.icon || ""),
    );
  });
  // Restore tags
  activeItinTags = new Set(ev.tags || []);
  ["must", "book", "tip", "free", "done"].forEach((t) => {
    document
      .getElementById("itag-" + t)
      ?.classList.toggle("active", activeItinTags.has(t));
  });
  // Load existing receipt photo
  const label = document.getElementById("itin-receipt-label");
  const nameDisplay = document.getElementById("itin-file-name-display");
  const previewLink = document.getElementById("itin-receipt-preview-link");
  const viewLink = document.getElementById("itin-receipt-view-link");
  document.getElementById("itin-receipt").value = "";
  if (ev.receiptUrl) {
    nameDisplay.textContent = "Reemplazar foto";
    label.classList.add("has-file");
    previewLink.style.display = "flex";
    viewLink.onclick = () => openLightbox(ev.receiptUrl);
  } else {
    nameDisplay.textContent = "Seleccionar foto o comprobante...";
    label.classList.remove("has-file");
    previewLink.style.display = "none";
  }
  const dateRow = document.getElementById("itin-date-row");
  if (dateRow) dateRow.style.display = "none";

  // Limpiar valores seleccionados de ubicación
  window._selectedLat = null;
  window._selectedLng = null;
  document.getElementById("itin-location-dropdown").style.display = "none";

  openModal("add-itin-event-modal");
}

// ─── AUTOCOMPLETADO DE LUGARES EN VIVO (PHOTON) ───
let _locationDebounceTimer = null;
document.addEventListener("DOMContentLoaded", () => {
  const locInput = document.getElementById("itin-location");
  if (!locInput) return;
  locInput.addEventListener("input", function () {
    if (window._isSelectingLocation) return; // Ignorar el evento si se está autocompletando

    clearTimeout(_locationDebounceTimer);
    const query = this.value.trim();
    const dropdown = document.getElementById("itin-location-dropdown");

    if (query.length < 3) {
      dropdown.style.display = "none";
      // Si borran casi todo el texto, reseteamos las coordenadas seguras
      window._selectedLat = null;
      window._selectedLng = null;
      return;
    }

    _locationDebounceTimer = setTimeout(async () => {
      try {
        // Volvemos a Nominatim agregando parámetros anti-bloqueo y enfoque en lugares turísticos
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(query)}&limit=5&addressdetails=1`);
        if (!res.ok) throw new Error("API Error");

        const data = await res.json();

        if (data && data.length > 0) {
          dropdown.innerHTML = "";
          data.forEach(itemInfo => {
            const name = itemInfo.name || itemInfo.display_name.split(',')[0];
            const address = itemInfo.address || {};

            const city = address.city || address.town || address.village || address.state || "";
            const country = address.country || "";

            // Construir subtítulo sin repetir el nombre
            let subtitleArr = [];
            if (city && city !== name) subtitleArr.push(city);
            if (country && country !== name) subtitleArr.push(country);
            const subtitle = subtitleArr.join(", ") || itemInfo.display_name.split(',').slice(1, 3).join(", ");

            const item = document.createElement("div");
            item.className = "location-dropdown-item";
            item.innerHTML = `<strong>${name}</strong> <small>${subtitle}</small>`;
            item.onclick = () => {
              window._isSelectingLocation = true; // Prevenir ciclo infinito del evento 'input'
              locInput.value = name + (subtitle ? `, ${subtitle}` : "");
              window._selectedLat = parseFloat(itemInfo.lat);
              window._selectedLng = parseFloat(itemInfo.lon);
              dropdown.style.display = "none";

              // Liberar el flag después de un momento
              setTimeout(() => { window._isSelectingLocation = false; }, 200);
            };
            dropdown.appendChild(item);
          });
          dropdown.style.display = "block";
        } else {
          dropdown.style.display = "none";
        }
      } catch (e) {
        console.warn("Autocompletado falló:", e);
      }
    }, 400); // 400ms después de que dejó de escribir
  });

  // Cerrar dropdown al hacer click afuera
  document.addEventListener("click", (e) => {
    const dropdown = document.getElementById("itin-location-dropdown");
    if (e.target.id !== "itin-location" && e.target.id !== "itin-location-dropdown") {
      if (dropdown) dropdown.style.display = "none";
    }
  });
});

async function saveItinEvent() {
  const title = document.getElementById("itin-title").value.trim();
  if (!title) return toast("Escribe el nombre de la actividad");
  const timeStart = document.getElementById("itin-time-start").value;
  const timeEnd = document.getElementById("itin-time-end").value;
  const location = document.getElementById("itin-location").value.trim();
  const mapsUrl = document.getElementById("itin-maps-url").value.trim();
  const note = document.getElementById("itin-note").value.trim();

  let date = editingItinDay;
  if (!date) {
    const sel = document.getElementById("itin-day-select");
    date = sel ? sel.value : null;
  }
  if (!date) return toast("Selecciona un día");

  // Upload comprobante if selected
  const fileInput = document.getElementById("itin-receipt");
  const file = fileInput ? fileInput.files[0] : null;
  const saveBtn = document.querySelector("#add-itin-event-modal .btn-primary");
  const statusText = document.getElementById("itin-receipt-upload-status");
  let receiptUrl = null;

  if (file) {
    saveBtn.disabled = true;
    statusText.style.display = "block";
    const formData = new FormData();
    formData.append("image", file);
    try {
      const res = await fetch(
        "https://api.imgbb.com/1/upload?key=ea6a31b8d4d6e7ef9c7c19cd8d6c4d44",
        { method: "POST", body: formData },
      );
      const data = await res.json();
      if (data.success) receiptUrl = data.data.url;
      else toast("Error al subir la imagen");
    } catch (e) {
      toast("Error subiendo foto: " + e.message);
    }
    saveBtn.disabled = false;
    statusText.style.display = "none";
  }

  let lat = null;
  let lng = null;

  if (location) {
    const existing = (window._itinEvents || []).find((e) => e.id === editingItinEventId);

    if (window._selectedLat != null && window._selectedLng != null) {
      // Si el usuario eligió exitosamente algo de la lista despegable, usar siempre esas
      lat = window._selectedLat;
      lng = window._selectedLng;
    } else if (existing && existing.location === location && existing.lat != null && existing.lng != null) {
      // Si el input no cambió y antes ya tenía coordenadas viejas válidas
      lat = existing.lat;
      lng = existing.lng;
    } else {
      lat = null;
      lng = null;
    }
  }

  const eventData = {
    title,
    timeStart,
    timeEnd,
    location,
    lat,
    lng,
    mapsUrl,
    note,
    bookingUrl: document.getElementById("itin-booking-url").value.trim(),
    date,
    category: selectedItinCat,
    icon: selectedItinCatIcon,
    tags: Array.from(activeItinTags),
    authorId: currentUser.uid,
    authorName: currentUser.displayName || currentUser.email,
    createdAt: serverTimestamp(),
  };
  if (receiptUrl) {
    eventData.receiptUrl = receiptUrl;
  } else if (editingItinEventId && window._itinDeleteReceipt) {
    eventData.receiptUrl = deleteField();
  } else if (editingItinEventId) {
    // Keep existing photo if no new one was selected
    const existing = (window._itinEvents || []).find(
      (e) => e.id === editingItinEventId,
    );
    if (existing && existing.receiptUrl)
      eventData.receiptUrl = existing.receiptUrl;
  }

  // Debug de coordenadas antes de enviar a Firebase
  console.log("✈️ Guardando evento Itinerario:", title, "| Lat:", lat, "| Lng:", lng);
  window._itinDeleteReceipt = false;

  if (editingItinEventId) {
    await updateDoc(
      doc(db, "trips", currentTripId, "itinerary", editingItinEventId),
      eventData,
    );
    toast("Actividad actualizada ✓");
  } else {
    eventData.createdAt = serverTimestamp();
    await addDoc(
      collection(db, "trips", currentTripId, "itinerary"),
      eventData,
    );
    toast("Actividad agregada ✓");
  }
  closeModal("add-itin-event-modal");
}

async function deleteItinEvent(eventId) {
  const ok = await customConfirm({
    icon: "🗑️",
    title: "¿Eliminar actividad?",
    msg: "Esta acción no se puede deshacer.",
    okLabel: "Eliminar",
  });
  if (!ok) return;
  await deleteDoc(doc(db, "trips", currentTripId, "itinerary", eventId));
  toast("Actividad eliminada");
}

// ─── GOOGLE MAPS INTEGRATION ───
function openGoogleMaps(mapsUrl) {
  if (!mapsUrl) return;

  // Validar y formatear la URL
  let url = mapsUrl.trim();

  // Si no es una URL completa, asumir que es una búsqueda
  if (!url.startsWith("http")) {
    url = `https://maps.google.com/?q=${encodeURIComponent(url)}`;
  }

  // Abrir en nueva ventana/pestaña
  window.open(url, "_blank");
}

function selectItinCat(el, cat, icon) {
  selectedItinCat = cat;
  selectedItinCatIcon = icon;
  document
    .querySelectorAll("#itin-cat-grid .cat-btn")
    .forEach((b) => b.classList.remove("selected"));
  el.classList.add("selected");
}

function toggleItinTag(tag) {
  if (activeItinTags.has(tag)) activeItinTags.delete(tag);
  else activeItinTags.add(tag);
  document
    .getElementById("itag-" + tag)
    ?.classList.toggle("active", activeItinTags.has(tag));
}

// ─── GALLERY ───
function subscribeGallery() {
  if (unsubscribeGallery) unsubscribeGallery();
  const q = collection(db, "trips", currentTripId, "gallery");
  unsubscribeGallery = onSnapshot(q, (snap) => {
    const photos = [];
    snap.forEach((d) => photos.push({ id: d.id, ...d.data() }));
    photos.sort((a, b) => {
      if (a.date && b.date) return a.date.localeCompare(b.date);
      return (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0);
    });
    window._galleryPhotos = photos;
    renderGallery();
  });
}

function renderGallery() {
  if (!currentTrip) return;
  const photos = window._galleryPhotos || [];
  const container = document.getElementById("gallery-content");
  const statsEl = document.getElementById("gallery-stats");

  if (!photos.length) {
    statsEl.style.display = "none";
    container.innerHTML = `<div class="gallery-empty"><div class="gallery-empty-icon">📷</div><p>La galería está vacía</p><small>Toca + para agregar las primeras fotos del viaje</small></div>`;
    return;
  }

  // Update stats
  const daysWithPhotos = new Set(photos.map((p) => p.date).filter(Boolean))
    .size;
  statsEl.style.display = "flex";
  document.getElementById("gallery-photo-count").textContent = photos.length;
  document.getElementById("gallery-day-count").textContent = daysWithPhotos;

  // Group by date
  const grouped = {};
  const noDayKey = "__noday__";
  photos.forEach((p) => {
    const key = p.date || noDayKey;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(p);
  });

  const allDays = getDaysBetween(currentTrip.startDate, currentTrip.endDate);
  const months = [
    "Ene",
    "Feb",
    "Mar",
    "Abr",
    "May",
    "Jun",
    "Jul",
    "Ago",
    "Sep",
    "Oct",
    "Nov",
    "Dic",
  ];
  const weekDays = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

  // Sort groups: dated days in order, then undated
  const sortedKeys = Object.keys(grouped).sort((a, b) => {
    if (a === noDayKey) return 1;
    if (b === noDayKey) return -1;
    return a.localeCompare(b);
  });

  container.innerHTML = sortedKeys
    .map((key) => {
      const dayPhotos = grouped[key];
      let label = "Sin fecha";
      let dayNum = "";
      if (key !== noDayKey) {
        const idx = allDays.indexOf(key);
        const d = new Date(key + "T12:00:00");
        label = `${weekDays[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]}`;
        dayNum = idx >= 0 ? `Día ${idx + 1} · ` : "";
      }

      const thumbsHtml = dayPhotos
        .map((p, i) => {
          const groupIdx = photos.indexOf(p);
          return `<div class="gallery-thumb" onclick="openGalleryLightbox(${groupIdx})">
            <img src="${p.url}" alt="${p.caption || ""}" loading="lazy">
            <div class="thumb-overlay"></div>
            ${p.caption ? `<div class="thumb-caption">${p.caption}</div>` : ""}
            <button class="thumb-del" onclick="event.stopPropagation();deleteGalleryPhoto('${p.id}')" title="Eliminar">✕</button>
          </div>`;
        })
        .join("");

      return `<div class="gallery-day-group">
          <div class="gallery-day-label">
            <span class="gdl-badge">${dayNum}${label}</span>
            <div class="gdl-line"></div>
            <span class="gdl-count">${dayPhotos.length} foto${dayPhotos.length !== 1 ? "s" : ""}</span>
          </div>
          <div class="gallery-grid">
            ${thumbsHtml}
          </div>
        </div>`;
    })
    .join("");
}

function openAddPhoto(preselectedDay) {
  galleryPhotoFile = null;
  gallerySelectedDay = preselectedDay || null;
  document.getElementById("gallery-caption").value = "";
  document.getElementById("gallery-photo-input").value = "";
  document.getElementById("gallery-photo-filename").textContent =
    "Seleccionar foto...";
  document.getElementById("gallery-preview-wrap").innerHTML =
    '<span style="font-size:2rem">🖼️</span>';
  document.getElementById("gallery-upload-status").style.display = "none";
  document.getElementById("gallery-save-btn").disabled = false;

  // Build day grid
  const days = getDaysBetween(currentTrip?.startDate, currentTrip?.endDate);
  const months = [
    "Ene",
    "Feb",
    "Mar",
    "Abr",
    "May",
    "Jun",
    "Jul",
    "Ago",
    "Sep",
    "Oct",
    "Nov",
    "Dic",
  ];
  const weekDays = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  const grid = document.getElementById("gallery-date-grid");
  const dayGroup = document.getElementById("gallery-day-group");

  if (days.length) {
    dayGroup.style.display = "";
    grid.innerHTML = days
      .map((dateStr, idx) => {
        const d = new Date(dateStr + "T12:00:00");
        const isSelected = preselectedDay === dateStr;
        return `<div class="gallery-date-btn${isSelected ? " selected" : ""}" id="gdayb-${dateStr}" onclick="selectGalleryDay('${dateStr}')" data-date="${dateStr}">
            <div style="font-weight:700;font-size:0.85rem">Día ${idx + 1}</div>
            <div style="font-size:0.7rem;color:var(--text3)">${weekDays[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]}</div>
          </div>`;
      })
      .join("");
    if (preselectedDay) gallerySelectedDay = preselectedDay;
  } else {
    dayGroup.style.display = "none";
  }

  openModal("add-photo-modal");
}

function selectGalleryDay(dateStr) {
  gallerySelectedDay = dateStr;
  document
    .querySelectorAll(".gallery-date-btn")
    .forEach((b) => b.classList.toggle("selected", b.dataset.date === dateStr));
}

function onGalleryPhotoSelected(input) {
  const file = input.files[0];
  if (!file) return;
  galleryPhotoFile = file;
  document.getElementById("gallery-photo-filename").textContent = file.name;
  const reader = new FileReader();
  reader.onload = (e) => {
    document.getElementById("gallery-preview-wrap").innerHTML =
      `<img src="${e.target.result}" alt="preview">`;
  };
  reader.readAsDataURL(file);
}

async function saveGalleryPhoto() {
  if (!galleryPhotoFile) return toast("Selecciona una foto primero 📷");
  const caption = document.getElementById("gallery-caption").value.trim();
  const saveBtn = document.getElementById("gallery-save-btn");
  const status = document.getElementById("gallery-upload-status");
  const bar = document.getElementById("gallery-upload-bar");

  saveBtn.disabled = true;
  status.style.display = "block";

  // Animate progress bar
  let prog = 0;
  const progInterval = setInterval(() => {
    prog = Math.min(prog + Math.random() * 15, 85);
    bar.style.width = prog + "%";
  }, 200);

  try {
    const formData = new FormData();
    formData.append("image", galleryPhotoFile);
    const res = await fetch(
      "https://api.imgbb.com/1/upload?key=ea6a31b8d4d6e7ef9c7c19cd8d6c4d44",
      { method: "POST", body: formData },
    );
    const data = await res.json();
    clearInterval(progInterval);
    if (!data.success) {
      toast("Error al subir la foto");
      saveBtn.disabled = false;
      status.style.display = "none";
      return;
    }
    bar.style.width = "100%";

    const photoData = {
      url: data.data.url,
      thumbUrl: data.data.thumb?.url || data.data.url,
      caption,
      date: gallerySelectedDay || null,
      authorId: currentUser.uid,
      authorName: currentUser.displayName || currentUser.email,
      createdAt: serverTimestamp(),
    };
    await addDoc(collection(db, "trips", currentTripId, "gallery"), photoData);
    toast("Foto agregada a la galería ✅");
    closeModal("add-photo-modal");
  } catch (e) {
    clearInterval(progInterval);
    toast("Error: " + e.message);
  }
  saveBtn.disabled = false;
  status.style.display = "none";
}

async function deleteGalleryPhoto(photoId) {
  const ok = await customConfirm({
    icon: "🗑️",
    title: "¿Eliminar foto?",
    msg: "Esta foto se eliminará de la galería del viaje.",
    okLabel: "Eliminar",
  });
  if (!ok) return;
  await deleteDoc(doc(db, "trips", currentTripId, "gallery", photoId));
  toast("Foto eliminada");
}

// Gallery lightbox
function openGalleryLightbox(index) {
  const photos = window._galleryPhotos || [];
  galleryLbPhotos = photos;
  galleryLbIndex = index;
  updateGalleryLb();
  document.getElementById("gallery-lightbox").classList.add("open");
}

function updateGalleryLb() {
  const p = galleryLbPhotos[galleryLbIndex];
  if (!p) return;
  const img = document.getElementById("gallery-lb-img");
  img.style.opacity = 0;
  img.src = p.url;
  img.onload = () => {
    img.style.opacity = 1;
  };
  document.getElementById("gallery-lb-caption").textContent = p.caption || "";
  const allDays = getDaysBetween(currentTrip?.startDate, currentTrip?.endDate);
  const months = [
    "Ene",
    "Feb",
    "Mar",
    "Abr",
    "May",
    "Jun",
    "Jul",
    "Ago",
    "Sep",
    "Oct",
    "Nov",
    "Dic",
  ];
  const weekDays = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  let metaStr = `Foto ${galleryLbIndex + 1} de ${galleryLbPhotos.length}`;
  if (p.date) {
    const idx = allDays.indexOf(p.date);
    const d = new Date(p.date + "T12:00:00");
    metaStr += ` · ${idx >= 0 ? "Día " + (idx + 1) + " · " : ""}${weekDays[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]}`;
  }
  if (p.authorName) metaStr += ` · por ${p.authorName.split(" ")[0]}`;
  document.getElementById("gallery-lb-meta").textContent = metaStr;
  document.getElementById("gallery-lb-prev").disabled = galleryLbIndex === 0;
  document.getElementById("gallery-lb-next").disabled =
    galleryLbIndex === galleryLbPhotos.length - 1;
}

function galleryLbNav(dir) {
  galleryLbIndex = Math.max(
    0,
    Math.min(galleryLbPhotos.length - 1, galleryLbIndex + dir),
  );
  updateGalleryLb();
}

function closeGalleryLightbox() {
  document.getElementById("gallery-lightbox").classList.remove("open");
}

// Keyboard nav for gallery lightbox
document.addEventListener("keydown", (e) => {
  if (!document.getElementById("gallery-lightbox").classList.contains("open"))
    return;
  if (e.key === "ArrowLeft") galleryLbNav(-1);
  if (e.key === "ArrowRight") galleryLbNav(1);
  if (e.key === "Escape") closeGalleryLightbox();
});

// Click outside lightbox image closes it
document
  .getElementById("gallery-lightbox")
  .addEventListener("click", function (e) {
    if (e.target === this) closeGalleryLightbox();
  });

// ─── INVITE ───
window.openModal = function (id) {
  if (id === "invite-modal" && currentTrip) {
    document.getElementById("modal-invite-code").textContent = currentTrip.code;
    document.getElementById("modal-members-list").innerHTML = tripMembers
      .map(
        (m) => `
          <div class="member-chip" style="margin-bottom:6px">
            <div class="avatar" style="width:24px;height:24px;font-size:0.7rem">${(m.name || "?")[0].toUpperCase()}</div>
            ${m.name}
          </div>
        `,
      )
      .join("");
  }
  document.getElementById(id).classList.add("show");
};

function copyCode() {
  navigator.clipboard.writeText(currentTrip?.code || "");
  toast("Código copiado! 📋");
}
function openModal(id) {
  document.getElementById(id).classList.add("show");
}
function closeModal(id) {
  document.getElementById(id).classList.remove("show");
}

document.querySelectorAll(".modal-overlay").forEach((overlay) => {
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) overlay.classList.remove("show");
  });
});

// ─── HELPERS ───
function formatDate(dateStr) {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-");
  const months = [
    "Ene",
    "Feb",
    "Mar",
    "Abr",
    "May",
    "Jun",
    "Jul",
    "Ago",
    "Sep",
    "Oct",
    "Nov",
    "Dic",
  ];
  return `${d} ${months[parseInt(m) - 1]} ${y}`;
}

function formatAmount(n, currency) {
  const num = Math.round(n);
  if (currency === "CLP") return "$" + num.toLocaleString("es-CL");
  if (currency === "EUR")
    return "€" + num.toLocaleString("es-ES", { minimumFractionDigits: 0 });
  return currency + " " + num.toLocaleString("en-US");
}

function selectCat(el, cat, icon) {
  selectedCat = cat;
  selectedCatIcon = icon;
  document
    .querySelectorAll(".category-grid .cat-btn")
    .forEach((b) => b.classList.remove("selected"));
  el.classList.add("selected");
  // Show tip only for Comida (shared expenses only)
  const tipGroup = document.getElementById("tip-group");
  if (tipGroup) {
    const showTip = cat === "Comida" && selectedExpType === "shared";
    tipGroup.style.display = showTip ? "block" : "none";
    if (!showTip) {
      tipType = "none";
      ["none", "pct", "fixed"].forEach((t) => {
        const tipEl = document.getElementById("tip-type-" + t);
        if (tipEl) tipEl.classList.toggle("selected", t === "none");
      });
      const wrap = document.getElementById("tip-input-wrap");
      if (wrap) wrap.style.display = "none";
      const calcText = document.getElementById("tip-calc-text");
      if (calcText) calcText.textContent = "";
    }
  }
}

function friendlyError(code) {
  const map = {
    "auth/invalid-email": "Correo inválido",
    "auth/user-not-found": "Usuario no encontrado",
    "auth/wrong-password": "Contraseña incorrecta",
    "auth/email-already-in-use": "Correo ya registrado",
    "auth/weak-password": "Contraseña muy débil (mínimo 6 caracteres)",
    "auth/invalid-credential": "Correo o contraseña incorrectos",
  };
  return map[code] || code;
}

let toastTimer;

// ─── NOTIFICATIONS MEJORADAS ───
function toast(msg, type = "info", duration = 3000) {
  const el = document.getElementById("toast");
  el.className = "toast show " + type;
  el.innerHTML = `<span class="toast-icon">${getToastIcon(type)}</span>${msg}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    el.classList.remove("show");
    setTimeout(() => {
      el.className = "toast";
    }, 300);
  }, duration);
}

function getToastIcon(type) {
  const icons = {
    success: "✓",
    error: "✕",
    warning: "⚠️",
    info: "ℹ️",
  };
  return icons[type] || icons.info;
}

function getNotificationIcon(type) {
  return getToastIcon(type);
}

// Helper to convert old emojis from Firebase to new Phosphor classes
function getIconClass(storedIcon) {
  if (!storedIcon) return "📦";
  if (storedIcon.startsWith("ph-")) return storedIcon;
  const map = {
    "🏠": "🏠",
    "✈️": "✈️",
    "🚗": "🚗",
    "🚘": "🚗",
    "🚆": "🚂",
    "🚂": "🚂",
    "🍽️": "🍽️",
    "🎯": "🎯",
    "🛍️": "🛍️",
    "🎉": "🎉",
    "💊": "💊",
    "📦": "📦",
    "🏛️": "🏛️",
    "🥾": "🏔️",
    "🚌": "🚌",
    "🏨": "ph-buildings",
    "🏖️": "ph-umbrella-simple",
    "📍": "ph-map-pin",
    "💸": "💸",
    "🔒": "🔒",
  };
  return map[storedIcon] || "📦";
}

function showNotification(title, message, type = "info", duration = 5000) {
  const notificationId = "notification-" + Date.now();
  const notification = document.createElement("div");
  notification.id = notificationId;
  notification.className = `notification-banner ${type} show`;
  notification.innerHTML = `
        <div class="notification-content">
          <div class="notification-icon">${getNotificationIcon(type)}</div>
          <div class="notification-text">
            <div class="notification-title">${title}</div>
            <div class="notification-message">${message}</div>
          </div>
          <button class="notification-close" onclick="closeNotification('${notificationId}')">✕</button>
        </div>
      `;

  document.body.appendChild(notification);

  setTimeout(() => {
    closeNotification(notificationId);
  }, duration);
}


function closeNotification(id) {
  const notification = document.getElementById(id);
  if (notification) {
    notification.classList.remove("show");
    setTimeout(() => {
      notification.remove();
    }, 300);
  }
}

// ─── FORM VALIDATION ───
window.validateEmail = function validateEmail(input) {
  const email = input.value.trim();
  const errorEl = document.getElementById(input.id + "-error");
  const iconEl = document.getElementById(input.id + "-icon");

  if (!email) {
    setValidationState(input, "", errorEl, iconEl);
    return false;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    setValidationState(
      input,
      "invalid",
      errorEl,
      iconEl,
      "Correo electrónico inválido",
    );
    return false;
  }

  setValidationState(input, "valid", errorEl, iconEl, "Correo válido");
  return true;
};

window.validatePassword = function validatePassword(input) {
  const password = input.value;
  const errorEl = document.getElementById(input.id + "-error");

  if (!password) {
    setValidationState(input, "", errorEl, null, "");
    return false;
  }

  if (password.length < 6) {
    setValidationState(input, "invalid", errorEl, null, "Mínimo 6 caracteres");
    return false;
  }

  setValidationState(input, "valid", errorEl, null, "Contraseña válida");
  return true;
};

window.validateName = function validateName(input) {
  const name = input.value.trim();
  const errorEl = document.getElementById(input.id + "-error");

  if (!name) {
    setValidationState(input, "", errorEl, null, "");
    return false;
  }

  if (name.length < 2) {
    setValidationState(
      input,
      "invalid",
      errorEl,
      null,
      "Nombre demasiado corto",
    );
    return false;
  }

  setValidationState(input, "valid", errorEl, null, "Nombre válido");
  return true;
};

function setValidationState(input, state, errorEl, iconEl, message = "") {
  // Remover todos los estados
  input.classList.remove("valid", "invalid");
  if (errorEl) {
    errorEl.classList.remove("error", "success");
    errorEl.textContent = "";
  }
  if (iconEl) {
    iconEl.classList.remove("show");
    iconEl.innerHTML = "";
  }

  // Aplicar nuevo estado
  if (state === "valid") {
    input.classList.add("valid");
    if (errorEl) {
      errorEl.classList.add("success");
      errorEl.textContent = message;
    }
    if (iconEl) {
      iconEl.classList.add("show");
      iconEl.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M20 6L9 17l-5-5"></path>
          </svg>`;
    }
  } else if (state === "invalid") {
    input.classList.add("invalid");
    if (errorEl) {
      errorEl.classList.add("error");
      errorEl.textContent = message;
    }
    if (iconEl) {
      iconEl.classList.add("show");
      iconEl.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="15" y1="9" x2="9" y2="15"></line>
            <line x1="9" y1="9" x2="15" y2="15"></line>
          </svg>`;
    }
  }
}

// ─── SKELETON HELPERS ───
function showSkeletonLoader(container, type = "card", count = 3) {
  const skeletons = [];
  for (let i = 0; i < count; i++) {
    let skeleton = "";
    switch (type) {
      case "trip":
        skeleton = `<div class="skeleton-trip-card"></div>`;
        break;
      case "expense":
        skeleton = `
              <div class="skeleton-expense-item">
                <div class="skeleton-expense-icon skeleton"></div>
                <div class="skeleton-expense-content">
                  <div class="skeleton skeleton-text medium"></div>
                  <div class="skeleton skeleton-text small"></div>
                </div>
                <div class="skeleton-expense-amount skeleton"></div>
              </div>
            `;
        break;
      case "member":
        skeleton = `
              <div class="skeleton-member-item">
                <div class="skeleton-member-avatar skeleton"></div>
                <div class="skeleton-member-info">
                  <div class="skeleton skeleton-text medium"></div>
                </div>
                <div class="skeleton-member-balance skeleton"></div>
              </div>
            `;
        break;
      default:
        skeleton = `<div class="skeleton-card"></div>`;
    }
    skeletons.push(skeleton);
  }

  if (container) {
    container.innerHTML = skeletons.join("");
  }
}

function toggleKebab(id, event) {
  event.stopPropagation();
  const menu = document.getElementById("kebab-" + id);
  const isOpen = menu.style.display === "block";
  document
    .querySelectorAll('[id^="kebab-"]')
    .forEach((m) => (m.style.display = "none"));
  menu.style.display = isOpen ? "none" : "block";
}

window.toast = toast;
window.showNotification = showNotification;
window.toggleKebab = toggleKebab;

function toggleItinKebab(id, event) {
  event.stopPropagation();
  const menu = document.getElementById("itin-kebab-" + id);
  const isOpen = menu.style.display === "block";
  document
    .querySelectorAll('[id^="itin-kebab-"]')
    .forEach((m) => (m.style.display = "none"));
  menu.style.display = isOpen ? "none" : "block";
}
function closeItinKebab(id) {
  const menu = document.getElementById("itin-kebab-" + id);
  if (menu) menu.style.display = "none";
}
window.toggleItinKebab = toggleItinKebab;
window.closeItinKebab = closeItinKebab;

// ─── THEME TOGGLE ───
function toggleTheme() {
  const root = document.documentElement;
  const body = document.body;
  const avatar = document.getElementById("nav-avatar");

  const isLight =
    root.style.getPropertyValue("--bg").includes("f8f9fa") ||
    root.style.getPropertyValue("--bg").includes("ffffff");

  if (isLight) {
    // Cambiar a oscuro
    root.style.setProperty("--bg", "#0a0c10");
    root.style.setProperty("--surface", "#111318");
    root.style.setProperty("--surface2", "#191d26");
    root.style.setProperty("--surface3", "#1f2535");
    root.style.setProperty("--border", "rgba(255, 255, 255, 0.07)");
    root.style.setProperty("--text", "#f0ede6");
    root.style.setProperty("--text2", "#8a8fa3");
    root.style.setProperty("--text3", "#5a5f73");
    if (!avatar.querySelector("img")) avatar.textContent = "🌘";
    toast("🎨 Tema oscuro activado", "success");
    localStorage.setItem("theme", "dark");
    document.cookie = "theme=dark; max-age=86400; SameSite=Lax";
  } else {
    // Cambiar a claro
    root.style.setProperty("--bg", "#f8f9fa");
    root.style.setProperty("--surface", "#ffffff");
    root.style.setProperty("--surface2", "#f1f3f7");
    root.style.setProperty("--surface3", "#e8eaf6");
    root.style.setProperty("--border", "rgba(0, 0, 0, 0.1)");
    root.style.setProperty("--text", "#1a1a1a");
    root.style.setProperty("--text2", "#6b7280");
    root.style.setProperty("--text3", "#9ca3af");
    if (!avatar.querySelector("img")) avatar.textContent = "🔆";
    toast("🎨 Tema claro activado", "success");
    localStorage.setItem("theme", "light");
    document.cookie = "theme=light; max-age=86400; SameSite=Lax";
  }
}

function loadTheme() {
  let savedTheme = "dark"; // Default

  // Intentar leer de localStorage primero
  const localTheme = localStorage.getItem("theme");
  if (localTheme) {
    savedTheme = localTheme;
  } else {
    // Si no hay nada en localStorage, intentar cookies
    const cookies = document.cookie.split(";");
    for (let cookie of cookies) {
      const [name, value] = cookie.trim().split("=");
      if (name === "theme") {
        savedTheme = value;
        break;
      }
    }
  }

  const root = document.documentElement;

  const avatar = document.getElementById("nav-avatar");

  if (savedTheme === "light") {
    // Aplicar tema claro directamente
    root.style.setProperty("--bg", "#f8f9fa");
    root.style.setProperty("--surface", "#ffffff");
    root.style.setProperty("--surface2", "#f1f3f7");
    root.style.setProperty("--surface3", "#e8eaf6");
    root.style.setProperty("--border", "rgba(0, 0, 0, 0.1)");
    root.style.setProperty("--text", "#1a1a1a");
    root.style.setProperty("--text2", "#6b7280");
    root.style.setProperty("--text3", "#9ca3af");
    if (!avatar.querySelector("img")) avatar.textContent = "🔆";
  } else {
    // FORZAR tema oscuro directamente (no confiar en variables por defecto)
    root.style.setProperty("--bg", "#0a0c10");
    root.style.setProperty("--surface", "#111318");
    root.style.setProperty("--surface2", "#191d26");
    root.style.setProperty("--surface3", "#1f2535");
    root.style.setProperty("--border", "rgba(255, 255, 255, 0.07)");
    root.style.setProperty("--text", "#f0ede6");
    root.style.setProperty("--text2", "#8a8fa3");
    root.style.setProperty("--text3", "#5a5f73");
    if (!avatar.querySelector("img")) avatar.textContent = "🌘";
  }
}

// Cargar tema al iniciar
document.addEventListener("DOMContentLoaded", loadTheme);

// ─── UX HELPER FUNCTIONS ───

// Loading overlay
function showLoading(message = "Cargando...") {
  const overlay = document.getElementById("loading-overlay");
  const text = overlay.querySelector("p");
  text.textContent = message;
  overlay.classList.add("show");
}

function hideLoading() {
  const overlay = document.getElementById("loading-overlay");
  overlay.classList.remove("show");
}

// Skeleton loading utilities
function createSkeletonText(size = "medium") {
  return `<div class="skeleton skeleton-text ${size}"></div>`;
}

function createSkeletonCard() {
  return `<div class="skeleton skeleton-card"></div>`;
}

function createSkeletonAvatar() {
  return `<div class="skeleton skeleton-avatar"></div>`;
}

// Enhanced feedback
function showButtonLoading(button, originalText) {
  button.classList.add("loading");
  button.disabled = true;
  button.dataset.originalText = originalText;
  button.innerHTML = '<span style="opacity:0">Cargando...</span>';
}

function hideButtonLoading(button) {
  button.classList.remove("loading");
  button.disabled = false;
  button.innerHTML = button.dataset.originalText || "Guardar";
}

// Touch feedback
function addTouchFeedback(element) {
  element.addEventListener("touchstart", () => {
    element.style.transform = "scale(0.95)";
  });

  element.addEventListener("touchend", () => {
    element.style.transform = "";
  });
}

// Initialize touch feedback for all interactive elements
document.addEventListener("DOMContentLoaded", () => {
  const interactiveElements = document.querySelectorAll(
    ".btn, .cat-btn, .trip-sidebar-btn",
  );
  interactiveElements.forEach(addTouchFeedback);
});

// Progress indicators
function updateProgress(element, percentage) {
  element.style.setProperty("--progress", percentage + "%");
}

// Enhanced error handling
function handleError(error, context = "") {
  console.error(`Error in ${context}:`, error);
  toast(`Algo salió mal ${context ? `al ${context}` : ""}. Intenta de nuevo.`);
  hideLoading();
}

// Smooth scroll
function smoothScrollTo(element) {
  element.scrollIntoView({ behavior: "smooth", block: "start" });
}

// ─── ITINERARY & SCROLL HELPERS ───

/**
 * Realiza un scroll suave hacia la parte superior de la aplicación
 */
function scrollToTop() {
  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}

/**
 * Expande o contrae todos los bloques de días en el itinerario
 */
function toggleAllItineraryDays(expand) {
  window._itinInitiallyCollapsed = !expand;
  const allDayBlocks = document.querySelectorAll(".itin-day-block");
  allDayBlocks.forEach(block => {
    if (expand) {
      block.classList.remove("collapsed");
    } else {
      block.classList.add("collapsed");
    }
  });
}

/**
 * Detector de scroll para mostrar el botón de "Volver arriba"
 */
window.addEventListener("scroll", () => {
  const scrollTopBtn = document.getElementById("scroll-top-btn");
  if (!scrollTopBtn) return;

  // Solo mostrar si el panel de itinerario está activo y hay scroll
  const isItinActive = document.getElementById("panel-itinerary")?.classList.contains("active");

  if (isItinActive && window.scrollY > 300) {
    scrollTopBtn.classList.add("visible");
  } else {
    scrollTopBtn.classList.remove("visible");
  }
}, { passive: true });

