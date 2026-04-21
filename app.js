var cardContent = window.cardContent || {};
var cardPhotos = window.cardPhotos || { hero: "", about: [], gallery: [] };
var GUEST_MESSAGES_URL = "https://script.google.com/macros/s/AKfycbxNOEq0Vi7vDqTHX2T81TeIR8lm7vWVs0MmgG10TvHJ4WXGwsP_C1xKg85B-TNKmVIh/exec";
// Example:
// var GUEST_MESSAGES_URL = "https://script.google.com/macros/s/APP_ID/exec?action=messages";

var state = {
  gallery: cardPhotos.gallery.slice(),
  galleryCount: cardPhotos.gallery.length,
  guestMessages: [],
  guestMessagePage: 1,
  guestMessagePageSize: 8,
  guestMessageExpanded: false,
  currentIdx: 0,
  music: null,
  isPlaying: false,
  autoStarted: false,
  musicPending: false,
  lightbox: null,
  touchStartX: 0
};

var els = {
  body: document.body,
  byId: {},
  accHeads: [],
  revealItems: [],
  get: function(id) {
    if (!this.byId[id]) this.byId[id] = document.getElementById(id);
    return this.byId[id];
  },
  refreshCollections: function() {
    this.accHeads = Array.prototype.slice.call(document.querySelectorAll(".acc-head"));
    this.revealItems = Array.prototype.slice.call(document.querySelectorAll(".rv"));
  }
};

function setText(id, value) {
  var el = els.get(id);
  if (el && value != null) el.textContent = value;
}

function appendTextWithBreaks(el, text) {
  text.split("\n").forEach(function(line, idx) {
    if (idx > 0) el.appendChild(document.createElement("br"));
    el.appendChild(document.createTextNode(line));
  });
}

function renderMessage(container, lang, data) {
  if (!container || !data) return;
  container.innerHTML = "";

  if (lang === "en" && data.intro) {
    var intro = document.createElement("p");
    intro.className = "body-en";
    intro.style.marginBottom = "1.4rem";
    intro.textContent = data.intro;
    container.appendChild(intro);
  }

  (data.paragraphs || []).forEach(function(text) {
    var p = document.createElement("p");
    p.className = lang === "ko" ? "body-ko" : "body-en";
    appendTextWithBreaks(p, text);
    container.appendChild(p);
  });

  var sig = document.createElement("div");
  sig.className = "sig";
  appendTextWithBreaks(sig, data.signature);
  container.appendChild(sig);
}

function renderDateSection(container, lang, data) {
  if (!container || !data) return;
  container.innerHTML = "";

  var phrase = document.createElement("span");
  phrase.className = lang === "ko" ? "date-ko-phrase" : "date-en-phrase";
  phrase.textContent = data.phrase;

  var date = document.createElement("span");
  date.className = lang === "ko" ? "date-ko-big" : "date-en-big";
  date.textContent = data.date;

  container.appendChild(phrase);
  container.appendChild(date);

  if (data.place) {
    var place = document.createElement("span");
    place.className = lang === "ko" ? "date-ko-big" : "date-en-big";
    place.style.marginTop = ".95rem";
    place.textContent = data.place;
    container.appendChild(place);
  }
}

function renderHeroName(container, data) {
  if (!container || !data) return;
  container.innerHTML = "";

  container.appendChild(document.createTextNode(data.left || ""));

  var separator = document.createElement("span");
  separator.className = "h-amp";
  separator.textContent = data.separator || "";
  container.appendChild(separator);

  container.appendChild(document.createTextNode(data.right || ""));
}

function renderLines(container, lines) {
  if (!container || !lines) return;
  container.innerHTML = "";

  lines.forEach(function(line, idx) {
    if (idx > 0) container.appendChild(document.createElement("br"));
    container.appendChild(document.createTextNode(line));
  });
}

function renderTextBlocks(container, blocks) {
  if (!container || !blocks) return;
  container.innerHTML = "";

  blocks.forEach(function(block) {
    var p = document.createElement("p");
    appendTextWithBreaks(p, block);
    container.appendChild(p);
  });
}

function renderParents(container, rows) {
  if (!container || !rows) return;
  container.innerHTML = "";

  rows.forEach(function(row) {
    var rowEl = document.createElement("div");
    rowEl.className = "parent-row";

    var family = document.createElement("span");
    family.className = "name";
    if (row.family) {
      family.textContent = row.family;
    } else {
      family.appendChild(document.createTextNode(row.familyPrefix || ""));
      if (row.flower) {
        var flower = document.createElement("span");
        flower.className = "flower-icon";
        flower.textContent = row.flower;
        family.appendChild(flower);
      }
      family.appendChild(document.createTextNode(row.familySuffix || ""));
    }

    var role = document.createElement("span");
    role.className = "role";
    role.textContent = row.role;

    var name = document.createElement("span");
    name.className = "name";
    name.textContent = row.name;

    rowEl.appendChild(family);
    rowEl.appendChild(role);
    rowEl.appendChild(name);
    container.appendChild(rowEl);
  });
}

function renderFooter(container, data) {
  if (!container || !data) return;
  container.innerHTML = "";

  var quote = document.createElement("p");
  quote.className = "fq-text";
  appendTextWithBreaks(quote, data.quote);

  var author = document.createElement("p");
  author.className = "fq-author";
  author.textContent = data.author;

  var message = document.createElement("p");
  message.className = "fq-msg";
  message.textContent = data.message;

  container.appendChild(quote);
  container.appendChild(author);
  container.appendChild(message);
}

function showToast(msg) {
  var toast = els.get("toast");
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add("show");
  setTimeout(function() { toast.classList.remove("show"); }, 2500);
}

function createGuestbookCard(item, isKo) {
  var sideLabel = item.side === "bride"
    ? (isKo ? cardContent.guestbook.sideBadge.bride.ko : cardContent.guestbook.sideBadge.bride.en)
    : (isKo ? cardContent.guestbook.sideBadge.groom.ko : cardContent.guestbook.sideBadge.groom.en);
  var sideClass = item.side === "bride" ? "w-bride" : "w-groom";

  var card = document.createElement("div");
  card.className = "wcard";

  var hdr = document.createElement("div");
  hdr.className = "wcard-hdr";

  var nameWrap = document.createElement("div");
  var nameEl = document.createElement("span");
  nameEl.className = "wcard-name";
  nameEl.textContent = item.name || "";
  nameWrap.appendChild(nameEl);

  if (item.relationship) {
    var relEl = document.createElement("span");
    relEl.className = "wcard-rel";
    relEl.textContent = " \u00B7 " + item.relationship;
    nameWrap.appendChild(relEl);
  }

  var sideBadge = document.createElement("span");
  sideBadge.className = "wcard-side " + sideClass;
  sideBadge.textContent = sideLabel;

  hdr.appendChild(nameWrap);
  hdr.appendChild(sideBadge);

  var msgEl = document.createElement("div");
  msgEl.className = "wtext";
  msgEl.textContent = "\u201C" + (item.message || "") + "\u201D";

  var tools = document.createElement("div");
  tools.className = "wcard-tools";

  var deleteToggle = document.createElement("button");
  deleteToggle.className = "wcard-delete-toggle";
  deleteToggle.type = "button";
  deleteToggle.setAttribute("aria-expanded", "false");
  deleteToggle.setAttribute("aria-label", isKo
    ? cardContent.guestbook.delete.iconLabel.ko
    : cardContent.guestbook.delete.iconLabel.en);

  var deleteIcon = document.createElement("img");
  deleteIcon.className = "wcard-delete-icon";
  deleteIcon.src = "assets/icons/trash.svg";
  deleteIcon.alt = "";
  deleteIcon.setAttribute("aria-hidden", "true");
  deleteToggle.appendChild(deleteIcon);

  var actions = document.createElement("div");
  actions.className = "wcard-delete-panel";

  var passwordInput = document.createElement("input");
  passwordInput.className = "wcard-password";
  passwordInput.type = "password";
  passwordInput.placeholder = isKo
    ? cardContent.guestbook.delete.placeholder.ko
    : cardContent.guestbook.delete.placeholder.en;

  var deleteBtn = document.createElement("button");
  deleteBtn.className = "wcard-delete";
  deleteBtn.type = "button";
  deleteBtn.textContent = isKo
    ? cardContent.guestbook.delete.button.ko
    : cardContent.guestbook.delete.button.en;
  deleteBtn.addEventListener("click", function() {
    handleGuestMessageDelete(item.id, passwordInput, deleteBtn);
  });

  var cancelBtn = document.createElement("button");
  cancelBtn.className = "wcard-delete-cancel";
  cancelBtn.type = "button";
  cancelBtn.textContent = isKo
    ? cardContent.guestbook.delete.cancel.ko
    : cardContent.guestbook.delete.cancel.en;

  var actionRow = document.createElement("div");
  actionRow.className = "wcard-delete-row";
  actionRow.appendChild(deleteBtn);
  actionRow.appendChild(cancelBtn);

  actions.appendChild(passwordInput);
  actions.appendChild(actionRow);

  function closeDeletePanel() {
    actions.classList.remove("open");
    deleteToggle.classList.remove("active");
    deleteToggle.setAttribute("aria-expanded", "false");
    passwordInput.value = "";
  }

  function openDeletePanel() {
    Array.prototype.slice.call(document.querySelectorAll(".wcard-delete-panel.open")).forEach(function(panel) {
      panel.classList.remove("open");
    });
    Array.prototype.slice.call(document.querySelectorAll(".wcard-delete-toggle.active")).forEach(function(btn) {
      btn.classList.remove("active");
      btn.setAttribute("aria-expanded", "false");
    });
    actions.classList.add("open");
    deleteToggle.classList.add("active");
    deleteToggle.setAttribute("aria-expanded", "true");
    setTimeout(function() {
      passwordInput.focus();
    }, 20);
  }

  deleteToggle.addEventListener("click", function() {
    if (actions.classList.contains("open")) {
      closeDeletePanel();
      return;
    }
    openDeletePanel();
  });

  cancelBtn.addEventListener("click", function() {
    closeDeletePanel();
    deleteToggle.focus();
  });

  card.appendChild(hdr);
  card.appendChild(msgEl);
  tools.appendChild(deleteToggle);
  card.appendChild(tools);
  card.appendChild(actions);
  return card;
}

function updateGuestbookToggleButton() {
  var openKo = els.get("guestOpenAllKo");
  var openEn = els.get("guestOpenAllEn");
  if (!openKo || !openEn) return;

  if (state.guestMessageExpanded) {
    openKo.textContent = cardContent.guestbook.all.close.ko;
    openEn.textContent = cardContent.guestbook.all.close.en;
  } else {
    openKo.textContent = cardContent.guestbook.all.open.ko;
    openEn.textContent = cardContent.guestbook.all.open.en;
  }
}

function getGuestMessagesUrl() {
  if (!GUEST_MESSAGES_URL) return "";
  if (GUEST_MESSAGES_URL.indexOf("action=") >= 0) return GUEST_MESSAGES_URL;
  return GUEST_MESSAGES_URL + (GUEST_MESSAGES_URL.indexOf("?") >= 0 ? "&" : "?") + "action=messages";
}

function getGuestMessagePostUrl() {
  return GUEST_MESSAGES_URL || "";
}

function renderGuestbookPreview() {
  var wall = els.get("wwall");
  var emptyEl = els.get("msgEmpty");
  var openBtn = els.get("guestOpenAllBtn");
  if (!wall || !emptyEl) return;

  wall.innerHTML = "";

  if (!state.guestMessages.length) {
    emptyEl.style.display = "";
    if (openBtn) openBtn.style.display = "none";
    state.guestMessageExpanded = false;
    updateGuestbookToggleButton();
    return;
  }

  emptyEl.style.display = "none";
  if (openBtn) openBtn.style.display = state.guestMessages.length > 3 ? "inline-flex" : "none";
  if (state.guestMessages.length <= 3) state.guestMessageExpanded = false;
  updateGuestbookToggleButton();

  var isKo = els.body.classList.contains("is-ko");
  state.guestMessages.slice(0, 3).forEach(function(item) {
    wall.appendChild(createGuestbookCard(item, isKo));
  });
}

function updateGuestbookPager() {
  var prevBtn = els.get("guestPrevBtn");
  var nextBtn = els.get("guestNextBtn");
  var pageInfo = els.get("guestPageInfo");
  var totalPages = Math.max(1, Math.ceil(Math.max(state.guestMessages.length - 3, 0) / state.guestMessagePageSize));

  if (state.guestMessagePage > totalPages) state.guestMessagePage = totalPages;
  if (state.guestMessagePage < 1) state.guestMessagePage = 1;

  if (prevBtn) prevBtn.disabled = state.guestMessagePage <= 1;
  if (nextBtn) nextBtn.disabled = state.guestMessagePage >= totalPages;
  if (pageInfo) pageInfo.textContent = state.guestMessagePage + " / " + totalPages;
}

function renderGuestbookPage(page) {
  var list = els.get("guestAllList");
  var panel = els.get("guestAllPanel");
  if (!list) return;

  state.guestMessagePage = page;
  list.innerHTML = "";

  if (!state.guestMessages.length || state.guestMessages.length <= 3) {
    if (panel) panel.style.display = "none";
    updateGuestbookPager();
    return;
  }

  var isKo = els.body.classList.contains("is-ko");
  var start = 3 + (state.guestMessagePage - 1) * state.guestMessagePageSize;
  var end = start + state.guestMessagePageSize;

  state.guestMessages.slice(start, end).forEach(function(item) {
    list.appendChild(createGuestbookCard(item, isKo));
  });

  if (panel) panel.style.display = state.guestMessageExpanded ? "block" : "none";
  updateGuestbookPager();
}

function scrollToGuestbookAllTitle() {
  var titleWrap = els.get("guestAllTitleWrap");
  if (!titleWrap) return;
  setTimeout(function() {
    titleWrap.scrollIntoView({ behavior: "smooth", block: "start" });
  }, 20);
}

function openGuestbookAll() {
  var panel = els.get("guestAllPanel");
  if (!panel || state.guestMessages.length <= 3) return;
  state.guestMessageExpanded = !state.guestMessageExpanded;
  panel.style.display = state.guestMessageExpanded ? "block" : "none";
  updateGuestbookToggleButton();
  if (state.guestMessageExpanded) {
    renderGuestbookPage(state.guestMessagePage);
    return;
  }

  var guestSection = els.get("guestbookLabelKo");
  if (guestSection) {
    setTimeout(function() {
      guestSection.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 20);
  }
}

function loadGuestMessages() {
  var url = getGuestMessagesUrl();
  if (!url) return Promise.resolve([]);

  return fetch(url, { cache: "no-store" })
    .then(function(response) {
      if (!response.ok) throw new Error("guest_messages_fetch_failed");
      return response.json();
    })
    .then(function(data) {
      var items = Array.isArray(data.items) ? data.items : [];
      state.guestMessages = items.slice().sort(function(a, b) {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
      state.guestMessagePage = 1;
      renderGuestbookPreview();
      if (state.guestMessageExpanded) renderGuestbookPage(1);
      return state.guestMessages;
    })
    .catch(function(err) {
      console.error("[guestbook] failed to load messages", err);
      state.guestMessages = [];
      state.guestMessagePage = 1;
      renderGuestbookPreview();
      renderGuestbookPage(1);
      return [];
    });
}

function postGuestMessage(payload) {
  var url = getGuestMessagePostUrl();
  if (!url) return Promise.reject(new Error("guest_messages_url_missing"));

  return fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain;charset=utf-8"
    },
    body: JSON.stringify({
      action: "createMessage",
      name: payload.name,
      relationship: payload.relationship,
      side: payload.side,
      message: payload.message,
      lang: payload.lang,
      password: payload.password
    })
  })
    .then(function(response) {
      if (!response.ok) throw new Error("guest_message_post_failed");
      return response.json();
    })
    .then(function(data) {
      if (!data || data.ok !== true || !data.item) {
        throw new Error((data && data.error) || "guest_message_post_failed");
      }
      return data.item;
    });
}

function postGuestMessageDelete(payload) {
  var url = getGuestMessagePostUrl();
  if (!url) return Promise.reject(new Error("guest_messages_url_missing"));

  return fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain;charset=utf-8"
    },
    body: JSON.stringify({
      action: "deleteMessage",
      id: payload.id,
      password: payload.password
    })
  })
    .then(function(response) {
      if (!response.ok) throw new Error("guest_message_delete_failed");
      return response.json();
    })
    .then(function(data) {
      if (!data || data.ok !== true || !data.deletedId) {
        throw new Error((data && data.error) || "guest_message_delete_failed");
      }
      return data;
    });
}

function setLang(l) {
  els.body.className = "is-" + l;
  els.get("bKo").classList.toggle("on", l === "ko");
  els.get("bEn").classList.toggle("on", l === "en");

  var nameInput = els.get("gName");
  var relInput = els.get("gRel");
  var msgInput = els.get("gMsg");
  if (!nameInput || !relInput || !msgInput) return;

  if (l === "ko") {
    nameInput.placeholder = cardContent.guestbook.fields.name.placeholder.ko;
    relInput.placeholder = cardContent.guestbook.fields.rel.placeholder.ko;
    msgInput.placeholder = cardContent.guestbook.fields.message.placeholder.ko;
    els.get("gPassword").placeholder = cardContent.guestbook.fields.password.placeholder.ko;
  } else {
    nameInput.placeholder = cardContent.guestbook.fields.name.placeholder.en;
    relInput.placeholder = cardContent.guestbook.fields.rel.placeholder.en;
    msgInput.placeholder = cardContent.guestbook.fields.message.placeholder.en;
    els.get("gPassword").placeholder = cardContent.guestbook.fields.password.placeholder.en;
  }

  renderGuestbookPreview();
  if (state.guestMessageExpanded) renderGuestbookPage(state.guestMessagePage);
}

function setHeroHeight() {
  document.documentElement.style.setProperty("--hero-height", window.innerHeight + "px");
}

function initContent() {
  setText("introTitleKo", cardContent.intro.ko);
  setText("introTitleEn", cardContent.intro.en);
  setText("bKo", cardContent.ui.langButtons.ko);
  setText("bEn", cardContent.ui.langButtons.en);
  setText("musicLabelKo", cardContent.ui.music.ko);
  setText("musicLabelEn", cardContent.ui.music.en);

  setText("heroEyeKo", cardContent.hero.eye.ko);
  setText("heroEyeEn", cardContent.hero.eye.en);
  renderHeroName(els.get("heroNameKo"), cardContent.hero.names.ko);
  renderHeroName(els.get("heroNameEn"), cardContent.hero.names.en);
  setText("heroDateKo", cardContent.hero.date.ko);
  setText("heroDateEn", cardContent.hero.date.en);

  renderMessage(els.get("messageKo"), "ko", cardContent.message.ko);
  renderMessage(els.get("messageEn"), "en", cardContent.message.en);
  renderDateSection(els.get("dateSectionKo"), "ko", cardContent.dateSection.ko);
  renderDateSection(els.get("dateSectionEn"), "en", cardContent.dateSection.en);
  renderParents(els.get("parentsKo"), cardContent.parents.ko);

  setText("aboutLabelKo", cardContent.about.label.ko);
  setText("aboutLabelEn", cardContent.about.label.en);
  setText("about1PairTitleKo", cardContent.about.cards[0].pairIntroTitle.ko);
  setText("about1PairTitleEn", cardContent.about.cards[0].pairIntroTitle.en);
  setText("about1PairQuoteKo", cardContent.about.cards[0].pairIntroQuote.ko);
  setText("about1PairQuoteEn", cardContent.about.cards[0].pairIntroQuote.en);
  setText("about2PairTitleKo", cardContent.about.cards[1].pairIntroTitle.ko);
  setText("about2PairTitleEn", cardContent.about.cards[1].pairIntroTitle.en);
  setText("about2PairQuoteKo", cardContent.about.cards[1].pairIntroQuote.ko);
  setText("about2PairQuoteEn", cardContent.about.cards[1].pairIntroQuote.en);

  setText("galleryLabelKo", cardContent.gallery.label.ko);
  setText("galleryLabelEn", cardContent.gallery.label.en);
  setText("moreLabelMoreKo", cardContent.ui.galleryMore.ko);
  setText("moreLabelLessKo", cardContent.ui.galleryLess.ko);
  setText("moreLabelMoreEn", cardContent.ui.galleryMore.en);
  setText("moreLabelLessEn", cardContent.ui.galleryLess.en);

  setText("giftLabelKo", cardContent.gifts.ko.label);
  setText("giftIntroKo", cardContent.gifts.ko.intro);
  setText("accBrideHead", cardContent.gifts.ko.bride.head);
  setText("accBrideBank", cardContent.gifts.ko.bride.bank);
  setText("accBrideNumber", cardContent.gifts.ko.bride.number);
  setText("accBrideName", cardContent.gifts.ko.bride.name);
  setText("accBrideCopyBtn", cardContent.gifts.ko.bride.button);
  els.get("accBrideCopyBtn").dataset.copyValue = cardContent.gifts.ko.bride.number;
  setText("accGroomHead", cardContent.gifts.ko.groom.head);
  setText("accGroomBank", cardContent.gifts.ko.groom.bank);
  setText("accGroomNumber", cardContent.gifts.ko.groom.number);
  setText("accGroomName", cardContent.gifts.ko.groom.name);
  setText("accGroomCopyBtn", cardContent.gifts.ko.groom.button);
  els.get("accGroomCopyBtn").dataset.copyValue = cardContent.gifts.ko.groom.number;

  setText("giftLabelEn", cardContent.gifts.en.label);
  setText("giftTitleEn", cardContent.gifts.en.title);
  renderTextBlocks(els.get("giftTextEn"), cardContent.gifts.en.text);
  setText("venmoId", cardContent.gifts.en.id);
  setText("venmoCopyBtn", cardContent.gifts.en.button);
  els.get("venmoCopyBtn").dataset.copyValue = cardContent.gifts.en.id.replace(/^@/, "");

  setText("guestbookLabelKo", cardContent.guestbook.label.ko);
  setText("guestbookLabelEn", cardContent.guestbook.label.en);
  setText("guestAllTitleKo", cardContent.guestbook.all.title.ko);
  setText("guestAllTitleEn", cardContent.guestbook.all.title.en);
  updateGuestbookToggleButton();
  renderLines(els.get("guestbookEmptyKo"), cardContent.guestbook.empty.ko);
  setText("guestbookEmptyEn", cardContent.guestbook.empty.en);
  setText("guestbookFormTitleKo", cardContent.guestbook.formTitle.ko);
  setText("guestbookFormTitleEn", cardContent.guestbook.formTitle.en);
  setText("guestNameLabelKo", cardContent.guestbook.fields.name.label.ko);
  setText("guestNameLabelEn", cardContent.guestbook.fields.name.label.en);
  setText("guestRelLabelKo", cardContent.guestbook.fields.rel.label.ko);
  setText("guestRelLabelEn", cardContent.guestbook.fields.rel.label.en);
  setText("guestSideLabelKo", cardContent.guestbook.fields.side.label.ko);
  setText("guestSideLabelEn", cardContent.guestbook.fields.side.label.en);
  setText("guestSideBrideKo", cardContent.guestbook.fields.side.bride.ko);
  setText("guestSideBrideEn", cardContent.guestbook.fields.side.bride.en);
  setText("guestSideGroomKo", cardContent.guestbook.fields.side.groom.ko);
  setText("guestSideGroomEn", cardContent.guestbook.fields.side.groom.en);
  setText("guestMsgLabelKo", cardContent.guestbook.fields.message.label.ko);
  setText("guestMsgLabelEn", cardContent.guestbook.fields.message.label.en);
  setText("guestPasswordLabelKo", cardContent.guestbook.fields.password.label.ko);
  setText("guestPasswordLabelEn", cardContent.guestbook.fields.password.label.en);
  setText("guestSubmitKo", cardContent.guestbook.submit.ko);
  setText("guestSubmitEn", cardContent.guestbook.submit.en);

  renderFooter(els.get("footerKo"), cardContent.footer.ko);
  renderFooter(els.get("footerEn"), cardContent.footer.en);
}

function initPhotos() {
  if (els.get("heroPhoto") && cardPhotos.hero && cardPhotos.hero.default) {
    els.get("heroPhoto").src = cardPhotos.hero.default;
  }
  if (els.get("aboutPhoto1") && cardPhotos.about[0]) els.get("aboutPhoto1").src = cardPhotos.about[0];
  if (els.get("aboutPhoto2") && cardPhotos.about[1]) els.get("aboutPhoto2").src = cardPhotos.about[1];
}

function toggleMusic() {
  if (!state.music) return;

  if (state.isPlaying) {
    state.music.pause();
    state.isPlaying = false;
    els.get("musicBtn").classList.remove("playing");
    els.get("iPlay").style.display = "inline";
    els.get("iPause").style.display = "none";
    return;
  }

  state.music.play().then(function() {
    state.isPlaying = true;
    els.get("musicBtn").classList.add("playing");
    els.get("iPlay").style.display = "none";
    els.get("iPause").style.display = "inline";
  }).catch(function() {});
}

function markMusicPlaying() {
  state.isPlaying = true;
  els.get("musicBtn").classList.add("playing");
  els.get("iPlay").style.display = "none";
  els.get("iPause").style.display = "inline";
}

function resetMusicUI() {
  state.isPlaying = false;
  state.musicPending = false;
  var btn = els.get("musicBtn");
  if (btn) btn.classList.remove("playing");
  var iPlay = els.get("iPlay");
  var iPause = els.get("iPause");
  if (iPlay) iPlay.style.display = "inline";
  if (iPause) iPause.style.display = "none";
}

function startMusicWithFade() {
  if (!state.music || state.isPlaying || state.musicPending) return Promise.resolve();

  state.musicPending = true;
  state.music.volume = 0;

  return state.music.play().then(function() {
    state.musicPending = false;
    state.autoStarted = true;
    markMusicPlaying();
    var v = 0;
    var fi = setInterval(function() {
      v = Math.min(v + 0.025, 0.35);
      if (state.music) state.music.volume = v;
      if (v >= 0.35) clearInterval(fi);
    }, 80);
  }).catch(function(e) {
    state.musicPending = false;
    throw e;
  });
}

function initLang() {
  setLang(cardContent.defaultLang || "ko");
}

function initMusic() {
  state.music = els.get("bgMusic");
  if (!state.music) return;

  state.music.addEventListener("error", function() {
    resetMusicUI();
  });

  state.music.addEventListener("ended", function() {
    if (!state.music.loop) resetMusicUI();
  });

  startMusicWithFade().catch(function() {});

  function tryStartOnInteraction() {
    if (!state.autoStarted && !state.isPlaying) {
      startMusicWithFade().catch(function() {});
    }
  }

  document.addEventListener("click", tryStartOnInteraction, { once: true });
  document.addEventListener("touchend", tryStartOnInteraction, { once: true });
}

function openLB(i) {
  state.currentIdx = i;
  els.get("lb-img").src = state.gallery[i].resized || state.gallery[i].full;
  els.get("lb-ctr").textContent = (i + 1) + " / " + state.galleryCount;
  state.lightbox.classList.add("show");
  els.body.style.overflow = "hidden";
}

function closeLB() {
  state.lightbox.classList.remove("show");
  els.body.style.overflow = "";
}

function lbNav(d) {
  state.currentIdx = (state.currentIdx + d + state.galleryCount) % state.galleryCount;
  els.get("lb-img").src = state.gallery[state.currentIdx].resized || state.gallery[state.currentIdx].full;
  els.get("lb-ctr").textContent = (state.currentIdx + 1) + " / " + state.galleryCount;
}

function lbTS(e) {
  state.touchStartX = e.changedTouches[0].screenX;
}

function lbTE(e) {
  var dx = e.changedTouches[0].screenX - state.touchStartX;
  if (dx < -40) lbNav(1);
  else if (dx > 40) lbNav(-1);
}

function handleLightboxBackdropClick(e) {
  if (e.target && e.target.id === "lb") closeLB();
}

function initLightbox() {
  state.lightbox = els.get("lb");
}

function renderGallery() {
  var gallery = els.get("gal-container");
  if (!gallery) return;

  gallery.innerHTML = "";
  state.gallery.forEach(function(photo, idx) {
    var item = document.createElement("div");
    item.className = idx >= 6 ? "gi hidden-gi" : "gi";
    if (idx >= 6) item.style.display = "none";
    item.dataset.idx = idx;

    var img = document.createElement("img");
    img.src = photo.thumb;
    img.alt = "";
    img.loading = "lazy";
    img.decoding = "async";

    item.appendChild(img);
    gallery.appendChild(item);
  });
}

function toggleGallery(btn) {
  var items = document.querySelectorAll(".hidden-gi");
  var isEx = btn.classList.contains("expanded");
  items.forEach(function(it) { it.style.display = isEx ? "none" : "block"; });
  btn.classList.toggle("expanded");
  btn.dataset.state = isEx ? "more" : "less";
  btn.querySelector(".more-icon").style.transform = isEx ? "rotate(0deg)" : "rotate(180deg)";

  if (isEx) {
    var gallery = els.get("gallery");
    if (gallery) {
      requestAnimationFrame(function() {
        requestAnimationFrame(function() {
          gallery.scrollIntoView({ behavior: "smooth", block: "start" });
        });
      });
    }
  }
}

function initGallery() {
  renderGallery();

  var galleryContainer = els.get("gal-container");
  if (!galleryContainer) return;

  galleryContainer.addEventListener("click", function(e) {
    var gi = e.target.closest(".gi");
    if (gi) openLB(parseInt(gi.dataset.idx, 10));
  });
}

function copyText(val, btn) {
  var isKo = els.body.classList.contains("is-ko");
  navigator.clipboard.writeText(val).then(function() {
    showToast(isKo ? cardContent.ui.copy.toast.ko : cardContent.ui.copy.toast.en);
    if (btn) {
      var old = btn.innerHTML;
      btn.textContent = isKo ? cardContent.ui.copy.done.ko : cardContent.ui.copy.done.en;
      btn.classList.add("done");
      setTimeout(function() {
        btn.innerHTML = old;
        btn.classList.remove("done");
      }, 2000);
    }
  });
}

function submitMessage() {
  var isKo = els.body.classList.contains("is-ko");
  var name = els.get("gName").value.trim();
  var rel = els.get("gRel").value.trim();
  var msg = els.get("gMsg").value.trim();
  var password = els.get("gPassword").value.trim();
  var sideEl = document.querySelector("input[name=side]:checked");
  var sideVal = sideEl ? sideEl.value : "bride";
  var submitBtn = els.get("guestSubmitBtn");

  if (!name || !msg || !password) {
    showToast(isKo ? cardContent.guestbook.validation.missing.ko : cardContent.guestbook.validation.missing.en);
    return;
  }

  if (submitBtn) submitBtn.disabled = true;

  postGuestMessage({
    name: name,
    relationship: rel,
    side: sideVal,
    message: msg,
    lang: isKo ? "ko" : "en",
    password: password
  })
    .then(function(item) {
      els.get("gName").value = "";
      els.get("gRel").value = "";
      els.get("gMsg").value = "";
      els.get("gPassword").value = "";

      if (item.status === "published") {
        state.guestMessages = [item].concat(state.guestMessages.filter(function(existing) {
          return existing.id !== item.id;
        })).sort(function(a, b) {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
        state.guestMessagePage = 1;
        renderGuestbookPreview();
        if (state.guestMessageExpanded) renderGuestbookPage(1);
        confetti();
        showToast(isKo ? cardContent.guestbook.toast.submitted.ko : cardContent.guestbook.toast.submitted.en);
        return;
      }

      showToast(isKo ? cardContent.guestbook.toast.pending.ko : cardContent.guestbook.toast.pending.en);
      return loadGuestMessages();
    })
    .catch(function(err) {
      console.error("[guestbook] failed to submit message", err);
      showToast(isKo ? cardContent.guestbook.toast.failed.ko : cardContent.guestbook.toast.failed.en);
    })
    .finally(function() {
      if (submitBtn) submitBtn.disabled = false;
    });
}

function handleGuestMessageDelete(id, passwordInput, deleteBtn) {
  var isKo = els.body.classList.contains("is-ko");
  var password = passwordInput ? passwordInput.value.trim() : "";

  if (!password) {
    showToast(isKo ? cardContent.guestbook.validation.deletePassword.ko : cardContent.guestbook.validation.deletePassword.en);
    return;
  }

  if (deleteBtn) deleteBtn.disabled = true;

  postGuestMessageDelete({
    id: id,
    password: password
  })
    .then(function(data) {
      state.guestMessages = state.guestMessages.filter(function(item) {
        return item.id !== data.deletedId;
      });
      renderGuestbookPreview();
      renderGuestbookPage(state.guestMessagePage);
      showToast(isKo ? cardContent.guestbook.toast.deleted.ko : cardContent.guestbook.toast.deleted.en);
    })
    .catch(function(err) {
      console.error("[guestbook] failed to delete message", err);
      var message = err && err.message === "invalid_password"
        ? (isKo ? cardContent.guestbook.toast.invalidPassword.ko : cardContent.guestbook.toast.invalidPassword.en)
        : (isKo ? cardContent.guestbook.toast.deleteFailed.ko : cardContent.guestbook.toast.deleteFailed.en);
      showToast(message);
    })
    .finally(function() {
      if (deleteBtn) deleteBtn.disabled = false;
    });
}

function bindCopyButton(id) {
  var btn = els.get(id);
  if (!btn) return;
  btn.addEventListener("click", function() {
    copyText(btn.dataset.copyValue, btn);
  });
}

function toggleAccordion(e) {
  var head = e.currentTarget;
  if (!head || !head.parentElement) return;
  head.parentElement.classList.toggle("open");
}

function initGifts() {
  bindCopyButton("accBrideCopyBtn");
  bindCopyButton("accGroomCopyBtn");
  bindCopyButton("venmoCopyBtn");
}

function initGuestbook() {
  var guestSubmitBtn = els.get("guestSubmitBtn");
  if (guestSubmitBtn) guestSubmitBtn.addEventListener("click", submitMessage);
  loadGuestMessages();
}

function initReveal() {
  var rvObs = new IntersectionObserver(function(entries) {
    entries.forEach(function(e) {
      if (e.isIntersecting) e.target.classList.add("in");
    });
  }, { threshold: 0.1 });

  els.revealItems.forEach(function(el) {
    rvObs.observe(el);
  });
}

function confetti() {
  var c = document.createElement("canvas");
  c.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:1000;";
  els.body.appendChild(c);
  c.width = innerWidth;
  c.height = innerHeight;

  var ctx = c.getContext("2d");
  var pal = ["#a68345", "#e8d090", "#f0b8c0", "#e8ddd0", "#fff", "#ffcce0"];
  var ps = [];

  for (var i = 0; i < 60; i++) {
    ps.push({
      x: Math.random() * c.width,
      y: -10,
      r: Math.random() * 4 + 2,
      col: pal[Math.floor(Math.random() * pal.length)],
      ta: 0,
      tai: Math.random() * 0.07 + 0.04,
      tilt: 0,
      speed: Math.random() * 2.5 + 1.2
    });
  }

  var f = 0;
  (function draw() {
    ctx.clearRect(0, 0, c.width, c.height);
    var alive = false;
    ps.forEach(function(p) {
      p.ta += p.tai;
      p.tilt = Math.sin(p.ta) * 15;
      p.y += p.speed;
      p.x += Math.sin(f / 20);
      if (p.y < c.height) alive = true;
      ctx.beginPath();
      ctx.lineWidth = p.r;
      ctx.strokeStyle = p.col;
      ctx.moveTo(p.x + p.tilt + p.r, p.y);
      ctx.lineTo(p.x + p.tilt, p.y + p.tilt + p.r);
      ctx.stroke();
    });
    f++;
    if (alive) requestAnimationFrame(draw);
    else if (els.body.contains(c)) els.body.removeChild(c);
  })();
}

function initBlossom() {
  var canvas = els.get("blossom");
  if (!canvas) return;

  var ctx = canvas.getContext("2d");
  var hero = els.get("hero");
  var petals = [];
  var animating = true;

  function resize() {
    canvas.width = hero.offsetWidth;
    canvas.height = hero.offsetHeight;
  }

  function animate() {
    if (!animating) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    petals.forEach(function(p) {
      p.x += p.vx;
      p.y += p.vy;
      if (p.y > canvas.height) {
        p.y = -10;
        p.x = Math.random() * canvas.width;
      }
      if (p.x > canvas.width + 10) p.x = -10;
      if (p.x < -10) p.x = canvas.width + 10;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.s, 0, Math.PI * 2);
      ctx.fill();
    });
    requestAnimationFrame(animate);
  }

  resize();
  for (var i = 0; i < 40; i++) {
    petals.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      s: Math.random() * 2.5 + 1,
      vx: Math.random() * 1 - 0.5,
      vy: Math.random() * 1 + 0.5
    });
  }

  animate();

  new IntersectionObserver(function(entries) {
    animating = entries[0].isIntersecting;
    if (animating) animate();
  }, { threshold: 0.01 }).observe(hero);

  window.addEventListener("resize", resize);
}

function closeIntro() {
  var overlay = els.get("introOverlay");
  if (!overlay || overlay.classList.contains("closing")) return;
  overlay.classList.add("closing");
  setTimeout(function() {
    overlay.style.display = "none";
    els.body.style.overflow = "";
  }, 900);
}

function initIntro() {
  var overlay = els.get("introOverlay");
  if (!overlay) return;

  var heroImg = els.get("heroPhoto");
  if (heroImg) {
    overlay.style.setProperty("--popup-bg", 'url("' + heroImg.src + '")');
  }

  var lang = els.body.classList.contains("is-en") ? "en" : "ko";
  var text = lang === "ko" ? cardContent.intro.ko : cardContent.intro.en;
  var koEl = els.get("introTitleKo");
  var enEl = els.get("introTitleEn");

  koEl.textContent = "";
  enEl.textContent = "";
  var target = lang === "ko" ? koEl : enEl;
  target.style.display = "block";
  (lang === "ko" ? enEl : koEl).style.display = "none";

  requestAnimationFrame(function() {
    requestAnimationFrame(function() {
      overlay.classList.add("loaded");
    });
  });

  var delay = 420;
  var perChar = lang === "ko" ? 115 : 68;
  var chars = text.split("");
  var typed = "";

  chars.forEach(function(ch, i) {
    setTimeout(function() {
      typed += ch;
      target.textContent = typed;
    }, delay + i * perChar);
  });

  var totalTyping = delay + chars.length * perChar;
  setTimeout(closeIntro, totalTyping + 900);
}

function initEventBindings() {
  var introOverlay = els.get("introOverlay");
  if (introOverlay) introOverlay.addEventListener("click", closeIntro);

  var bKo = els.get("bKo");
  if (bKo) bKo.addEventListener("click", function() { setLang("ko"); });

  var bEn = els.get("bEn");
  if (bEn) bEn.addEventListener("click", function() { setLang("en"); });

  var musicBtn = els.get("musicBtn");
  if (musicBtn) musicBtn.addEventListener("click", toggleMusic);

  if (state.lightbox) state.lightbox.addEventListener("click", handleLightboxBackdropClick);

  var lbClose = els.get("lb-close");
  if (lbClose) lbClose.addEventListener("click", closeLB);

  var lbPrev = els.get("lb-prev");
  if (lbPrev) lbPrev.addEventListener("click", function() { lbNav(-1); });

  var lbNext = els.get("lb-next");
  if (lbNext) lbNext.addEventListener("click", function() { lbNav(1); });

  var lbImg = els.get("lb-img");
  if (lbImg) {
    lbImg.addEventListener("touchstart", lbTS, { passive: true });
    lbImg.addEventListener("touchend", lbTE, { passive: true });
  }

  var moreBtn = els.get("moreBtn");
  if (moreBtn) {
    moreBtn.addEventListener("click", function() {
      toggleGallery(moreBtn);
    });
  }

  els.accHeads.forEach(function(head) {
    head.addEventListener("click", toggleAccordion);
  });

  var guestOpenAllBtn = els.get("guestOpenAllBtn");
  if (guestOpenAllBtn) {
    guestOpenAllBtn.addEventListener("click", function() {
      openGuestbookAll();
    });
  }

  var guestPrevBtn = els.get("guestPrevBtn");
  if (guestPrevBtn) {
    guestPrevBtn.addEventListener("click", function() {
      renderGuestbookPage(state.guestMessagePage - 1);
      scrollToGuestbookAllTitle();
    });
  }

  var guestNextBtn = els.get("guestNextBtn");
  if (guestNextBtn) {
    guestNextBtn.addEventListener("click", function() {
      renderGuestbookPage(state.guestMessagePage + 1);
      scrollToGuestbookAllTitle();
    });
  }

  window.addEventListener("orientationchange", function() {
    setTimeout(setHeroHeight, 100);
  });

  document.addEventListener("keydown", function(e) {
    if ((e.ctrlKey || e.metaKey) && (e.key === "=" || e.key === "-" || e.key === "0" || e.key === "+" || e.key === "_")) {
      e.preventDefault();
    }
  });

  window.addEventListener("wheel", function(e) {
    if (e.ctrlKey) e.preventDefault();
  }, { passive: false });

  document.addEventListener("gesturestart", function(e) { e.preventDefault(); }, { passive: false });
  document.addEventListener("gesturechange", function(e) { e.preventDefault(); }, { passive: false });

  document.addEventListener("touchmove", function(e) {
    if (e.touches.length > 1) e.preventDefault();
  }, { passive: false });
}

function initApp() {
  if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  window.scrollTo(0, 0);
  setHeroHeight();
  els.refreshCollections();
  initContent();
  initPhotos();
  initLang();
  initMusic();
  initLightbox();
  initGallery();
  initGifts();
  initGuestbook();
  initReveal();
  initBlossom();
  initIntro();
  initEventBindings();
}

window.addEventListener("pageshow", function() {
  window.scrollTo(0, 0);
});

initApp();
