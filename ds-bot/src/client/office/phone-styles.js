export const PHONE_CSS = `
.of-phone-launcher{display:flex;align-items:center;gap:8px;width:100%;min-height:38px;margin:9px 0 0;padding:7px 10px;border:1px solid #d8e1ce;border-radius:8px;background:#f9fbf5;box-shadow:none;color:#4c6d5d;font-family:'Segoe UI',system-ui,sans-serif;font-size:11px;font-weight:600;line-height:1.4;text-align:left;transition:background .12s ease,border-color .12s ease}
.of-phone-launcher:hover{background:#e9f0e2;border-color:#c8d8bb;color:#345e49}
.of-phone-launcher:disabled{opacity:.5;cursor:default}
.of-phone-launcher svg{flex:none;color:#57806d}
.of-phone-launcher-label{flex:1;min-width:0;text-align:left;white-space:nowrap}
.of-phone-launcher-key{flex:none;padding:0 4px;border:1px solid #d2deca;border-radius:4px;background:#eef3e8;color:#6f8577;font:600 9px/1.6 'Segoe UI',system-ui,sans-serif}
.of-phone-launcher-badge{flex:none;width:7px;height:7px;border-radius:50%;background:#bf5b4b}
.of-phone-launcher:hover{background:#eef3ea;color:#28576b}
.of-phone-launcher:disabled{opacity:.45;cursor:default}
.of-phone{--of-phone-ink:#26343f;--of-phone-ink-2:#5d6e64;--of-phone-ink-3:#8a978c;--of-phone-paper:#f6f3ea;--of-phone-paper-2:#f9f6ee;--of-phone-line:#e3ddcd;--of-phone-accent:#4f7f6c;--of-phone-accent-2:#36594d;--of-phone-tint:#e4ebdd;--of-phone-unread:#bf5b4b;--of-phone-bezel:#3a4340;--of-phone-bezel-2:#202724;position:absolute;z-index:30;right:max(20px,env(safe-area-inset-right));bottom:max(20px,env(safe-area-inset-bottom));width:clamp(280px,calc(100% - 24px),344px);height:clamp(420px,calc(100% - 110px),700px);color:var(--of-phone-ink);font-family:'Segoe UI',system-ui,sans-serif;font-size:13px;line-height:1.4;isolation:isolate;pointer-events:auto;animation:of-phone-in 200ms cubic-bezier(.2,.7,.2,1) 60ms both}
.of-phone *{box-sizing:border-box}
.of-phone button{font:inherit;color:inherit}
.of-phone-frame{position:absolute;inset:0;padding:10px 10px 14px;border-radius:40px;background:linear-gradient(155deg,var(--of-phone-bezel) 0%,var(--of-phone-bezel-2) 78%);box-shadow:0 22px 48px #1d2c2638,0 3px 10px #1d2c2629,inset 0 1px 0 #ffffff2e,inset 0 -2px 4px #00000038}
.of-phone-frame::before{content:'';position:absolute;left:50%;top:4px;width:34px;height:4px;transform:translateX(-50%);border-radius:999px;background:#00000052;box-shadow:0 0 0 1px #ffffff0f}
.of-phone-screen{position:relative;display:flex;flex-direction:column;width:100%;height:100%;border-radius:34px;overflow:hidden;background:linear-gradient(160deg,#eef3ea 0%,#d9e6d6 55%,#cfdcc9 100%);box-shadow:inset 0 0 0 1px #0d16120f}
.of-phone[data-screen=app] .of-phone-screen,.of-phone[data-screen=chat] .of-phone-screen{background:var(--of-phone-paper)}
.of-phone-body{position:relative;display:flex;flex-direction:column;flex:1;min-height:0;min-width:0}
.of-phone-status{position:relative;z-index:2;display:flex;align-items:center;justify-content:space-between;flex:none;height:24px;padding:0 16px;font-size:10.5px;font-weight:600;letter-spacing:.2px;font-variant-numeric:tabular-nums;color:var(--of-phone-ink)}
.of-phone-status-time{line-height:1}
.of-phone-status-icons{display:flex;align-items:center;gap:5px;color:var(--of-phone-ink)}
.of-phone-status-icons svg{display:block}
.of-phone-live{position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0 0 0 0);clip-path:inset(50%);white-space:nowrap;border:0}
.of-phone-home{position:relative;display:flex;flex-direction:column;flex:1;min-height:0;overflow:hidden}
.of-phone-wall{position:absolute;inset:0;overflow:hidden;pointer-events:none}
.of-phone-wall::before{content:'';position:absolute;top:-14%;right:-24%;width:88%;height:54%;border-radius:46% 54% 48% 52%/52% 46% 54% 48%;background:#ffffff52;transform:rotate(14deg)}
.of-phone-wall-window{position:absolute;border:1px solid #ffffff7a;border-radius:12px;background:linear-gradient(180deg,#ffffff66,#ffffff14);box-shadow:0 6px 18px #ffffff1f}
.of-phone-wall-window::before,.of-phone-wall-window::after{content:'';position:absolute;background:#ffffff66}
.of-phone-wall-window::before{top:0;bottom:0;left:50%;width:1px}
.of-phone-wall-window::after{top:46%;left:0;right:0;height:1px}
.of-phone-wall-window.w1{top:66px;left:-18px;width:132px;height:152px;transform:rotate(-7deg)}
.of-phone-wall-window.w2{top:214px;right:-36px;width:150px;height:172px;transform:rotate(6deg);opacity:.72}
.of-phone-wall-leaf{position:absolute;border-radius:50%;background:radial-gradient(ellipse at 40% 40%,#6f8f7b59,#6f8f7b00 72%)}
.of-phone-wall-leaf.l1{bottom:82px;left:-26px;width:196px;height:142px;transform:rotate(18deg)}
.of-phone-wall-leaf.l2{top:-14px;right:-30px;width:152px;height:112px;transform:rotate(-24deg);opacity:.8}
.of-phone-home-main{position:relative;z-index:1;display:flex;flex-direction:column;align-items:center;justify-content:center;flex:1;min-height:0;gap:8px;padding:10px 18px 4px}
.of-phone-clock{font-size:46px;font-weight:300;line-height:1.05;letter-spacing:-2px;font-variant-numeric:tabular-nums;color:#2a3d37;text-shadow:0 1px 0 #ffffff80}
.of-phone-date{margin-bottom:16px;font-size:11.5px;letter-spacing:.2px;color:#52665c}
.of-phone-apps{display:flex;flex-wrap:wrap;justify-content:center;gap:10px 22px;max-width:240px}
.of-phone-app-tile{display:flex;flex-direction:column;align-items:center;gap:7px;padding:0;border:0;background:transparent;color:#2f4540;cursor:pointer}
.of-phone-app-icon{display:grid;place-items:center;width:58px;height:58px;border:1px solid #d6ccb2;border-radius:16px;background:linear-gradient(165deg,#fbf6e8,#efe6d1);box-shadow:0 4px 12px #263c341f,inset 0 1px 0 #fff;transition:transform .12s ease}
.of-phone-app-tile:hover .of-phone-app-icon{transform:translateY(-1px)}
.of-phone-app-label{font-size:10.5px;font-weight:600;letter-spacing:.3px}
.of-phone-home-foot{position:relative;z-index:1;flex:none;padding:0 16px 6px;text-align:center}
.of-phone-hint{display:inline-flex;align-items:center;gap:6px;padding:5px 10px;border-radius:999px;background:#ffffff59;color:#5d7166;font-size:10.5px;line-height:1.4}
.of-phone-hint kbd{padding:1px 5px;border:1px solid #c9d6c5;border-radius:4px;background:#f8fbf3;color:#4d6a5b;font:600 9.5px/1.5 'Segoe UI',system-ui,sans-serif}
.of-phone-indicator{flex:none;width:120px;height:4px;margin:0 auto 8px;border-radius:999px;background:rgba(38,52,63,.25)}
.of-phone-app{display:flex;flex-direction:column;flex:1;min-height:0;background:var(--of-phone-paper)}
.of-phone-topbar{display:flex;align-items:center;gap:4px;flex:none;height:44px;padding:0 8px;border-bottom:1px solid var(--of-phone-line);background:var(--of-phone-paper-2)}
.of-phone-title{flex:1;margin:0;text-align:center;font-size:15px;font-weight:600;letter-spacing:.2px;color:#2c3f3b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.of-phone-icon-button{display:grid;place-items:center;flex:none;width:32px;height:32px;padding:0;border:0;border-radius:9px;background:transparent;color:#50665f;cursor:pointer}
.of-phone-icon-button:hover{background:#ece7d9}
.of-phone-search{flex:none;padding:7px 10px 5px}
.of-phone-search input{display:block;width:100%;height:32px;padding:0 10px;border:1px solid #ddd6c3;border-radius:10px;background:#fffdf8;color:var(--of-phone-ink);font-size:12px;outline:none}
.of-phone-search input:focus-visible{outline:2px solid #7ba18e;outline-offset:1px}
.of-phone-search input::placeholder{color:#98a396}
.of-phone-list{flex:1;min-height:0;overflow:auto;overscroll-behavior:contain;scrollbar-width:thin;scrollbar-color:#d8d1be transparent;padding:2px 0 6px}
.of-phone-section{padding:12px 14px 4px;font-size:10.5px;font-weight:600;letter-spacing:.7px;text-transform:uppercase;color:#93a094}
.of-phone-row{position:relative;display:flex;align-items:center;gap:10px;width:100%;min-height:64px;padding:8px 12px;border:0;background:transparent;color:var(--of-phone-ink);text-align:left;cursor:pointer}
.of-phone-row:hover{background:#f1ede1}
.of-phone-row:active{background:#ebe6d8}
.of-phone-row+.of-phone-row::before{content:'';position:absolute;top:0;left:66px;right:12px;height:1px;background:#e6e0d0}
.of-phone-row[data-docked=true]{background:#f3f0e5}
.of-phone-row[data-docked=true] .of-phone-row-name{color:#66756b}
.of-phone-row[data-docked=true] .of-phone-row-preview{color:#8c6a4e}
.of-phone-avatar{position:relative;display:grid;place-items:center;flex:none;width:44px;height:44px;border-radius:13px;overflow:hidden;background:var(--of-phone-tint);box-shadow:inset 0 0 0 1px #26343f0f}
.of-phone-avatar canvas{display:block;image-rendering:pixelated}
.of-phone-avatar .of-phone-avatar-canvas{width:auto;height:44px}
.of-phone-mosaic{grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr;gap:1px;background:#d7e1cf}
.of-phone-mosaic-cell{display:grid;place-items:center;width:100%;height:100%;overflow:hidden;background:#e6ecdf}
.of-phone-mosaic-canvas{display:block;width:auto;height:100%;max-width:100%}
.of-phone-row-main{display:flex;flex-direction:column;flex:1;min-width:0;gap:3px}
.of-phone-row-name{font-size:14px;font-weight:600;line-height:1.35;color:#2b3d3a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.of-phone-row-preview{font-size:12px;line-height:1.35;color:#7d8b80;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.of-phone-row-side{display:flex;flex-direction:column;align-items:flex-end;flex:none;align-self:flex-start;gap:6px;min-width:46px;padding-top:9px}
.of-phone-row-time{font-size:10.5px;line-height:1;font-variant-numeric:tabular-nums;color:#98a396;white-space:nowrap}
.of-phone-unread{width:9px;height:9px;border-radius:50%;background:var(--of-phone-unread);box-shadow:0 0 0 2px #f6f3eae6}
.of-phone-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;padding:40px 24px;text-align:center}
.of-phone-empty-glyph{display:grid;place-items:center;width:52px;height:52px;margin-bottom:6px;border-radius:16px;background:#ece7d9;color:#7d9184}
.of-phone-empty strong{font-size:14px;font-weight:600;color:#54655b}
.of-phone-empty p{max-width:24ch;margin:0;font-size:12px;line-height:1.5;color:#8a978c}
.of-phone-tabs{display:flex;align-items:stretch;flex:none;height:56px;border-top:1px solid var(--of-phone-line);background:var(--of-phone-paper-2)}
.of-phone-tab{position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;flex:1;padding:0;border:0;background:transparent;color:#97a196;font-size:10px;font-weight:500;letter-spacing:.3px;cursor:pointer}
.of-phone-tab:hover{color:#5d7a6b}
.of-phone-tab[aria-selected=true]{color:#3f6b5c}
.of-phone-tab[aria-selected=true]::before{content:'';position:absolute;top:0;left:50%;width:26px;height:2px;transform:translateX(-50%);border-radius:0 0 3px 3px;background:#4f7f6c}
.of-phone-tab svg{display:block}
.of-phone-body>.of-phone-chat{flex:1;min-height:0;min-width:0}
.of-phone :is(button,input,[tabindex]):focus-visible{outline:2px solid #6f9483;outline-offset:2px;border-radius:8px}
.of-phone-row:focus-visible{outline-offset:-2px;border-radius:8px}
@keyframes of-phone-in{from{opacity:0;transform:translateY(28px) scale(.94)}to{opacity:1;transform:none}}
@keyframes of-phone-fade{from{opacity:0}to{opacity:1}}
.of-phone[data-quiet],.of-workspace[data-quiet] .of-phone{animation:of-phone-fade 120ms ease both}
@media (prefers-reduced-motion:reduce){.of-phone{animation:of-phone-fade 120ms ease both}}
@container office (max-width:760px){
  .of-phone-launcher{min-height:34px;font-size:10px;padding:5px 8px;margin-top:8px}
  .of-phone{right:max(12px,env(safe-area-inset-right));bottom:max(12px,env(safe-area-inset-bottom));width:clamp(280px,calc(100% - 24px),320px);height:calc(100% - 80px)}
  .of-phone-clock{font-size:40px}
}
@container office (max-height:640px){.of-phone{height:calc(100% - 60px)}}
@media (max-height:640px){.of-phone{height:calc(100% - 60px)}}
`
