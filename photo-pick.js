// Temporary review widget: flip through candidate photos for a slot and check the keeper.
// Remove <photo-pick> usages once final photos are chosen.
(function () {
  if (customElements.get('photo-pick')) return;

  const KEY = (id) => 'mvbc-photo-pick:' + id;

  class PhotoPick extends HTMLElement {
    static get observedAttributes() { return ['srcs', 'slot-id', 'slotid', 'radius', 'height', 'ratio', 'fit-position', 'fitposition']; }

    connectedCallback() {
      if (this._built) return;
      this._built = true;
      this.attachShadow({ mode: 'open' });
      this.i = 0;
      this.kept = false;
      const saved = this._load();
      if (saved) {
        const list = this.list;
        const at = saved.src ? list.indexOf(saved.src) : -1;
        if (at >= 0) { this.i = at; this.kept = !!saved.kept; }
        else { this.i = 0; this.kept = false; }
      }
      this._render();
    }

    attributeChangedCallback() { if (this._built) this._render(); }

    get list() {
      return (this.getAttribute('srcs') || '').split(',').map(s => s.trim()).filter(Boolean);
    }
    get slotId() { return this.getAttribute('slot-id') || this.getAttribute('slotid') || 'slot'; }

    _load() {
      try { return JSON.parse(localStorage.getItem(KEY(this.slotId)) || 'null'); } catch (e) { return null; }
    }
    _save() {
      try {
        localStorage.setItem(KEY(this.slotId), JSON.stringify({ i: this.i, kept: this.kept, src: this.list[this.i] || '' }));
      } catch (e) {}
    }

    _render() {
      const list = this.list;
      if (this.i >= list.length) { this.i = 0; this.kept = false; }
      const radius = this.getAttribute('radius') || '28px';
      const height = this.getAttribute('height') || '';
      const ratio = this.getAttribute('ratio') || '';
      const pos = this.getAttribute('fit-position') || this.getAttribute('fitposition') || 'center';
      const src = list[this.i] || '';
      const sizing = height ? `height:${height};` : (ratio ? `aspect-ratio:${ratio};` : 'height:100%;');

      this.shadowRoot.innerHTML = `
        <style>
          :host { display:block; }
          .wrap { position:relative; width:100%; ${sizing} ${height === '100%' ? 'min-height:220px;' : ''} border-radius:${radius}; overflow:hidden; background:#EFE9DA; }
          @media (max-width:760px) { .wrap { ${height && height !== '100%' ? 'height:min(' + height + ', 72vw);' : ''} border-radius:${parseInt(radius) > 0 ? '20px' : radius}; } .pill { opacity:1; pointer-events:auto; } }
          img { width:100%; height:100%; object-fit:cover; object-position:${pos}; display:block; }
          .ring { position:absolute; inset:0; border-radius:${radius}; pointer-events:none;
                  box-shadow: inset 0 0 0 3px transparent; transition:box-shadow .15s; }
          .wrap:hover .ring { box-shadow: inset 0 0 0 3px ${this.kept ? 'rgba(46,107,69,0.95)' : 'transparent'}; }
          .pill { position:absolute; left:50%; bottom:14px; transform:translateX(-50%);
                  display:flex; align-items:center; gap:4px; padding:5px 7px; border-radius:999px;
                  background:rgba(20,18,14,0.34); backdrop-filter:blur(8px);
                  -webkit-backdrop-filter:blur(8px); border:1px solid rgba(255,255,255,0.22);
                  font:600 12px/1 'Source Sans 3', system-ui, sans-serif; color:rgba(255,255,255,0.92);
                  opacity:0; pointer-events:none; transition:opacity .15s; }
          .wrap:hover .pill, .pill:focus-within { opacity:1; pointer-events:auto; }
          button { appearance:none; border:0; background:transparent; color:inherit; cursor:pointer;
                   font:inherit; line-height:1; padding:4px 6px; border-radius:999px; }
          button:hover { background:rgba(255,255,255,0.16); }
          .count { min-width:28px; text-align:center; letter-spacing:.04em; font-variant-numeric:tabular-nums; opacity:.85; }
          .keep { display:flex; align-items:center; gap:5px; padding:4px 8px 4px 6px; margin-left:2px;
                  border-left:1px solid rgba(255,255,255,0.22); }
          .box { width:13px; height:13px; border-radius:4px; border:1.5px solid rgba(255,255,255,0.7);
                 display:grid; place-items:center; font-size:9px; }
          .keep[data-on="1"] .box { background:#4E9A5B; border-color:#4E9A5B; }
          .keep[data-on="1"] { color:#fff; }
          .name { position:absolute; top:12px; left:12px; padding:4px 9px; border-radius:999px;
                  background:rgba(20,18,14,0.34); backdrop-filter:blur(8px); -webkit-backdrop-filter:blur(8px);
                  border:1px solid rgba(255,255,255,0.2); color:rgba(255,255,255,0.9);
                  font:600 11px/1 'Source Sans 3', system-ui, sans-serif; opacity:0; transition:opacity .15s; }
          .wrap:hover .name { opacity:1; }
        </style>
        <div class="wrap">
          ${src ? `<img src="${src}" alt="">` : ''}
          <div class="ring"></div>
          <div class="name" style="display:${list.length > 1 ? 'block' : 'none'}">${(src.split('/').pop() || '')}</div>
          <div class="pill" style="display:${list.length > 1 ? 'flex' : 'none'}">
            <button class="prev" title="Previous photo" aria-label="Previous photo">&#8249;</button>
            <span class="count">${list.length ? this.i + 1 : 0}/${list.length}</span>
            <button class="next" title="Next photo" aria-label="Next photo">&#8250;</button>
            <button class="keep" data-on="${this.kept ? 1 : 0}" title="Mark this photo as the keeper">
              <span class="box">${this.kept ? '&#10003;' : ''}</span><span>Keep</span>
            </button>
          </div>
        </div>`;

      const r = this.shadowRoot;
      // keep pill clicks from triggering an enclosing link
      if (list.length < 2) return;
      r.querySelector('.pill').addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); });
      r.querySelector('.prev').onclick = () => this._step(-1);
      r.querySelector('.next').onclick = () => this._step(1);
      r.querySelector('.keep').onclick = () => { this.kept = !this.kept; this._save(); this._render(); };
    }

    _step(d) {
      const n = this.list.length || 1;
      this.i = (this.i + d + n) % n;
      this.kept = false;
      this._save();
      this._render();
    }
  }

  customElements.define('photo-pick', PhotoPick);
})();
