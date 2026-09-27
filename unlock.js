/**
 * 임상병리사 CBT — 잠금 해제 (교재 문항 은행 복호화)
 * data/bank.enc.json: AES-256-GCM, 키 = PBKDF2-SHA256(비밀번호, salt, iter)
 * 성공하면 QUESTIONS 를 채우고 app.js 를 불러온다.
 */
(function () {
  "use strict";
  var LS_KEY = "cbt-bank-key-v1";
  var me = document.currentScript;
  var ver = (me && /[?&]v=([^&]+)/.exec(me.src) || [])[1] || String(Date.now());
  var imagesMap = {};
  var cryptoKey = null;
  var urlCache = {};

  function b64d(s) {
    var bin = atob(s);
    var out = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  function b64e(buf) {
    var b = new Uint8Array(buf), s = "";
    for (var i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
    return btoa(s);
  }
  function $(id) {
    return document.getElementById(id);
  }
  function setMsg(t, isErr) {
    var m = $("lock-msg");
    if (!m) return;
    m.textContent = t || "";
    m.classList.toggle("lock-msg--error", !!isErr);
  }

  var metaPromise = null;
  function fetchMeta() {
    if (!metaPromise) {
      metaPromise = fetch("data/bank.enc.json?v=" + ver, { cache: "no-cache" }).then(function (r) {
        if (!r.ok) throw new Error("bank fetch " + r.status);
        return r.json();
      });
    }
    return metaPromise;
  }

  function deriveKey(pw, meta) {
    return crypto.subtle
      .importKey("raw", new TextEncoder().encode(pw), "PBKDF2", false, ["deriveKey"])
      .then(function (base) {
        return crypto.subtle.deriveKey(
          { name: "PBKDF2", salt: b64d(meta.salt), iterations: meta.iter, hash: "SHA-256" },
          base,
          { name: "AES-GCM", length: 256 },
          true,
          ["decrypt"]
        );
      });
  }

  function gunzip(buf) {
    if (typeof DecompressionStream === "undefined") {
      return Promise.reject(new Error("이 브라우저는 압축 해제를 지원하지 않습니다. 최신 Safari/Chrome으로 열어 주세요."));
    }
    var stream = new Blob([buf]).stream().pipeThrough(new DecompressionStream("gzip"));
    return new Response(stream).text();
  }

  function decryptBank(key, meta) {
    return crypto.subtle
      .decrypt({ name: "AES-GCM", iv: b64d(meta.iv) }, key, b64d(meta.ct))
      .then(gunzip)
      .then(function (txt) {
        return JSON.parse(txt);
      });
  }

  function storeKey(key, remember) {
    return crypto.subtle.exportKey("raw", key).then(function (raw) {
      var v = b64e(raw);
      try {
        sessionStorage.setItem(LS_KEY, v);
        if (remember) localStorage.setItem(LS_KEY, v);
        else localStorage.removeItem(LS_KEY);
      } catch (_) {}
    });
  }
  function storedKey() {
    try {
      return localStorage.getItem(LS_KEY) || sessionStorage.getItem(LS_KEY);
    } catch (_) {
      return null;
    }
  }
  function forgetKey() {
    try {
      localStorage.removeItem(LS_KEY);
      sessionStorage.removeItem(LS_KEY);
    } catch (_) {}
  }
  function importStored(v) {
    return crypto.subtle.importKey("raw", b64d(v), { name: "AES-GCM" }, true, ["decrypt"]);
  }

  function start(payload, key) {
    cryptoKey = key;
    imagesMap = payload.images || {};
    window.CBT_BANK_VERSION = payload.version || "kukshi-v1";
    var qs = payload.questions || {};
    Object.keys(qs).forEach(function (sid) {
      QUESTIONS[sid] = qs[sid];
    });
    document.documentElement.classList.remove("is-locked");
    var lock = $("screen-lock");
    if (lock) lock.hidden = true;
    var app = $("app");
    if (app) app.hidden = false;
    var s = document.createElement("script");
    s.src = "app.js?v=" + ver;
    s.onload = function () {
      var btn = $("btn-lock");
      if (btn) {
        btn.hidden = false;
        btn.addEventListener("click", function () {
          if (!window.confirm("이 기기에 저장된 잠금 해제 정보를 지우고 잠글까요?")) return;
          forgetKey();
          location.reload();
        });
      }
    };
    document.body.appendChild(s);
  }

  window.CBTBank = {
    loadImage: function (name) {
      if (urlCache[name]) return Promise.resolve(urlCache[name]);
      var file = imagesMap[name];
      if (!file || !cryptoKey) return Promise.reject(new Error("no image"));
      return fetch("data/img/" + file + "?v=" + ver)
        .then(function (r) {
          if (!r.ok) throw new Error("img " + r.status);
          return r.arrayBuffer();
        })
        .then(function (buf) {
          var b = new Uint8Array(buf);
          return crypto.subtle.decrypt({ name: "AES-GCM", iv: b.slice(0, 12) }, cryptoKey, b.slice(12));
        })
        .then(function (pt) {
          var url = URL.createObjectURL(new Blob([pt], { type: "image/jpeg" }));
          urlCache[name] = url;
          return url;
        });
    },
    lock: function () {
      forgetKey();
      location.reload();
    },
  };

  function showForm() {
    var lock = $("screen-lock");
    if (lock) lock.hidden = false;
    var inp = $("lock-password");
    if (inp) setTimeout(function () { inp.focus(); }, 50);
  }

  function onSubmit(ev) {
    ev.preventDefault();
    var inp = $("lock-password");
    var pw = inp ? inp.value : "";
    if (!pw) {
      setMsg("비밀번호를 입력하세요.", true);
      return;
    }
    var remember = $("lock-remember") ? $("lock-remember").checked : false;
    var btn = $("lock-submit");
    if (btn) btn.disabled = true;
    setMsg("확인 중…", false);
    var keyRef;
    fetchMeta()
      .then(function (meta) {
        return deriveKey(pw, meta).then(function (key) {
          keyRef = key;
          return decryptBank(key, meta);
        });
      })
      .then(function (payload) {
        return storeKey(keyRef, remember).then(function () {
          setMsg("", false);
          start(payload, keyRef);
        });
      })
      .catch(function (err) {
        if (btn) btn.disabled = false;
        if (err && err.name === "OperationError") {
          setMsg("비밀번호가 올바르지 않습니다. 다시 입력해 주세요.", true);
          if (inp) {
            inp.value = "";
            inp.focus();
          }
        } else {
          setMsg("문항을 불러오지 못했습니다: " + (err && err.message ? err.message : err), true);
        }
      });
  }

  function boot() {
    var form = $("lock-form");
    if (form) form.addEventListener("submit", onSubmit);
    if (!window.crypto || !crypto.subtle) {
      showForm();
      setMsg("이 브라우저에서는 암호 해제를 사용할 수 없습니다 (HTTPS 필요).", true);
      return;
    }
    var v = storedKey();
    if (!v) {
      showForm();
      return;
    }
    setMsg("저장된 정보로 여는 중…", false);
    var keyRef;
    importStored(v)
      .then(function (key) {
        keyRef = key;
        return fetchMeta();
      })
      .then(function (meta) {
        return decryptBank(keyRef, meta);
      })
      .then(function (payload) {
        try {
          sessionStorage.setItem(LS_KEY, v);
        } catch (_) {}
        setMsg("", false);
        start(payload, keyRef);
      })
      .catch(function (err) {
        if (err && err.name === "OperationError") forgetKey();
        showForm();
        setMsg(
          err && err.name === "OperationError"
            ? "저장된 잠금 해제 정보가 맞지 않습니다. 비밀번호를 다시 입력해 주세요."
            : "문항을 불러오지 못했습니다. 네트워크를 확인하고 다시 시도해 주세요.",
          err && err.name !== "OperationError"
        );
      });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
