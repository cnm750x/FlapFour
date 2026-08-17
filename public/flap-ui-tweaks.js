/**
 * flap-ui-tweaks.js — 前端布局微调（不改动 index.html 主体）
 *
 * 本文件由 src/index.js 在下发 index.html 时自动注入 <script>。
 *
 * 职责：将「交易活动 / 信号」列（.th-trades / .col-trades / .mc-split-right）
 *      宽度在原有基础上增加 100px（300px → 400px）。
 *
 * 实现分两层，两层都幂等，重复执行不会叠加：
 *   1) 注入 CSS 覆盖表头/单元格/内层滚动容器的固定宽度（!important）
 *   2) 运行时修正 <colgroup><col> 的行内 width（table-layout:fixed 下
 *      列宽由 col 决定，行内样式优先级高于样式表，必须直接改）
 */
(function () {
  'use strict';

  var DELTA    = 100;   // 需要增加的像素数
  var BASE     = 300;   // index.html 中原尺寸
  var TARGET   = BASE + DELTA;   // 400
  var FLAG     = 'flapTradesColWidened';

  /* ---------- 1) CSS 覆盖 ---------- */
  function injectCss() {
    if (document.getElementById('flap-ui-tweaks-css')) return;
    var st = document.createElement('style');
    st.id = 'flap-ui-tweaks-css';
    st.textContent = [
      /* 表头 */
      '.th-trades, .th-mc-trades {',
      '  width: ' + TARGET + 'px !important;',
      '  min-width: ' + TARGET + 'px !important;',
      '}',
      /* 单元格 */
      '.col-trades {',
      '  width: ' + TARGET + 'px !important;',
      '  min-width: ' + TARGET + 'px !important;',
      '}',
      /* 内层滚动容器（真正渲染明细行的那个 div） */
      '.col-trades .mc-split-right {',
      '  flex: 0 0 ' + TARGET + 'px !important;',
      '  width: ' + TARGET + 'px !important;',
      '  max-width: ' + TARGET + 'px !important;',
      '}',
      /* 明细行自身不要被旧的固定宽卡住 */
      '.col-trades .fm-trade-item {',
      '  width: 100% !important;',
      '  box-sizing: border-box !important;',
      '}'
    ].join('\n');
    (document.head || document.documentElement).appendChild(st);
  }

  /* ---------- 2) 修正 colgroup 里对应列的行内 width ---------- */
  function widenCols(root) {
    var tables = (root || document).querySelectorAll('table');
    for (var i = 0; i < tables.length; i++) {
      var table = tables[i];
      var cg = table.querySelector('colgroup');
      if (!cg) continue;

      // 找到「交易活动/信号」表头的列序号
      var head = table.querySelector('.th-trades, .th-mc-trades');
      var idx = -1;
      if (head && head.parentNode) {
        var cells = head.parentNode.children;
        for (var c = 0; c < cells.length; c++) {
          if (cells[c] === head) { idx = c; break; }
        }
      }
      if (idx < 0) continue;

      var cols = cg.children;
      if (idx >= cols.length) continue;
      var col = cols[idx];
      if (col.dataset && col.dataset[FLAG] === '1') continue;   // 已处理过

      var cur = parseFloat(col.style.width || '') || 0;
      if (!cur) {
        var cs = window.getComputedStyle(col).width;
        cur = parseFloat(cs) || BASE;
      }
      col.style.width = (cur + DELTA) + 'px';
      if (col.dataset) col.dataset[FLAG] = '1';
    }
  }

  function run() {
    injectCss();
    try { widenCols(document); } catch (_) {}
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }

  // 表格是 JS 动态构建的，监听后续新增的 colgroup
  try {
    var mo = new MutationObserver(function (muts) {
      for (var i = 0; i < muts.length; i++) {
        var added = muts[i].addedNodes;
        for (var j = 0; j < added.length; j++) {
          var n = added[j];
          if (!n || n.nodeType !== 1) continue;
          if (n.tagName === 'COLGROUP' || n.tagName === 'TABLE' || n.querySelector) {
            try { widenCols(n.tagName === 'TABLE' ? n.parentNode || document : document); } catch (_) {}
            return;
          }
        }
      }
    });
    mo.observe(document.documentElement, { childList: true, subtree: true });
  } catch (_) {}
})();
