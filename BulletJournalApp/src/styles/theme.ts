import { CSSProperties } from 'react';
import { COLORS, COLORS_DARK } from '../utils/constants';

type Styles = Record<string, CSSProperties>;

export function getStyles(isDark: boolean): Styles {
  const C = isDark ? COLORS_DARK : COLORS;
  return {
    app: {
      maxWidth: 430,
      margin: '0 auto',
      height: '100vh',
      background: C.bg,
      fontFamily: '-apple-system, "Noto Sans KR", sans-serif',
      position: 'relative',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    },
    loadingWrap: {
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      height: '100vh', background: C.bg,
    },
    loadingDot: { fontSize: 48, fontWeight: 800, color: C.primary, animation: 'pulse 1.5s infinite' },

    /* header */
    header: {
      background: C.headerBg,
      padding: '14px 20px 0',
      borderRadius: '0 0 20px 20px',
      paddingTop: 'env(safe-area-inset-top, 14px)',
    },
    stickyTop: {
      flexShrink: 0,
      zIndex: 30,
      background: C.bg,
    },
    headerTop: {
      display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8,
    },
    logo: {
      fontSize: 22, fontWeight: 700, color: C.headerText, letterSpacing: 4,
      fontFamily: 'Georgia, serif',
    },
    headerActions: {
      display: 'flex', gap: 8, alignItems: 'center',
    },
    todayBtn: {
      background: 'rgba(250,246,240,0.15)', border: '1px solid rgba(250,246,240,0.25)',
      color: C.headerText, fontSize: 12, padding: '5px 14px', borderRadius: 14,
      fontFamily: '-apple-system, sans-serif', cursor: 'pointer',
    },
    settingsBtn: {
      background: 'rgba(250,246,240,0.15)', border: '1px solid rgba(250,246,240,0.25)',
      color: C.headerText, fontSize: 14, padding: '4px 10px', borderRadius: 14,
      fontFamily: '-apple-system, sans-serif', cursor: 'pointer',
    },
    navBar: {
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, padding: '10px 0 14px',
    },
    navBtn: {
      background: 'none', border: 'none', color: 'rgba(250,246,240,0.7)',
      fontSize: 28, cursor: 'pointer', padding: '0 8px', fontWeight: 300, lineHeight: 1,
    },
    navLabel: {
      color: C.headerText, fontSize: 17, fontWeight: 600, minWidth: 150, textAlign: 'center',
    },

    /* tabs */
    tabBar: {
      display: 'flex', padding: '12px 16px 4px', gap: 6, overflowX: 'auto',
    },
    tab: {
      flex: 1, padding: '9px 0', borderRadius: 10, minWidth: 'fit-content',
      background: 'transparent', border: `1.5px solid ${C.border}`,
      fontSize: 13, fontWeight: 500, color: C.textSecondary,
      cursor: 'pointer', fontFamily: '-apple-system, "Noto Sans KR", sans-serif',
      outline: 'none', boxShadow: 'none', WebkitTapHighlightColor: 'transparent',
    },
    tabActive: {
      background: C.primary, borderColor: C.primary, color: isDark ? '#1a1a1a' : C.headerText,
    },

    /* main */
    main: { padding: '12px 16px', flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: 80 },

    /* today badge */
    todayBadge: {
      display: 'inline-block', background: C.accent, color: 'white',
      fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 8,
      letterSpacing: 1.5, marginBottom: 12,
    },

    /* empty state */
    emptyState: { textAlign: 'center', padding: '48px 20px' },
    emptyAdd: {
      marginTop: 16, background: 'none', border: `1.5px dashed ${C.textLight}`,
      color: C.textSecondary, fontSize: 13, padding: '8px 20px', borderRadius: 10,
      cursor: 'pointer', fontFamily: '-apple-system, sans-serif',
    },

    /* entry row */
    entryOuter: {
      position: 'relative', overflow: 'hidden', borderRadius: 12, marginBottom: 6,
    },
    entrySwipeBg: {
      position: 'absolute', right: 0, top: 0, bottom: 0, width: 120,
      display: 'flex', transition: 'opacity 0.2s',
    },
    swipeEdit: {
      flex: 1, background: C.blue, color: 'white', border: 'none', fontSize: 13,
      fontWeight: 600, cursor: 'pointer', fontFamily: '-apple-system, sans-serif',
    },
    swipeDelete: {
      flex: 1, background: C.accent, color: 'white', border: 'none', fontSize: 13,
      fontWeight: 600, cursor: 'pointer', fontFamily: '-apple-system, sans-serif',
    },
    entryRow: {
      display: 'flex', alignItems: 'center', gap: 8,
      background: C.bgWhite, padding: '12px 14px', borderRadius: 12,
      boxShadow: `0 1px 3px ${C.cardShadow}`,
      cursor: 'pointer', position: 'relative', zIndex: 1,
    },
    prMark: { fontSize: 14, fontWeight: 700, flexShrink: 0 },
    entrySym: { fontSize: 22, fontWeight: 800, width: 20, textAlign: 'center', flexShrink: 0, lineHeight: 1 },
    entryText: { fontSize: 14, lineHeight: 1.5, color: C.textPrimary },
    timeTag: {
      display: 'inline-block', fontSize: 11, color: C.textSecondary, marginLeft: 6,
      background: isDark ? '#3a3530' : '#f5f0e8', padding: '1px 6px', borderRadius: 4,
    },
    statusBadge: {
      fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 6,
      whiteSpace: 'nowrap', flexShrink: 0,
    },
    notionBadge: {
      fontSize: 9, color: C.blue, marginLeft: 4,
    },

    /* weekly */
    weekDay: {
      marginBottom: 4, background: C.bgWhite, borderRadius: 12,
      padding: '10px 14px', boxShadow: `0 1px 3px ${C.cardShadow}`,
    },
    weekDayToday: { borderLeft: `3px solid ${C.accent}` },
    weekDayHeader: {
      display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, cursor: 'pointer',
    },
    weekDayName: { fontSize: 14, fontWeight: 700, color: C.textPrimary },
    weekDayNum: { fontSize: 13, color: C.textSecondary, fontWeight: 500 },
    weekDayNumToday: {
      background: C.accent, color: 'white', borderRadius: '50%',
      width: 22, height: 22, display: 'inline-flex', alignItems: 'center',
      justifyContent: 'center', fontSize: 12, fontWeight: 700,
    },
    weekAddBtn: {
      background: 'none', border: `1px solid ${C.border}`, color: C.textMuted,
      width: 24, height: 24, borderRadius: '50%', fontSize: 16, cursor: 'pointer',
      display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1,
      fontFamily: '-apple-system, sans-serif',
    },
    weekEntry: {
      display: 'flex', alignItems: 'center', padding: '3px 0 3px 28px', cursor: 'pointer',
    },

    /* monthly */
    miniCal: {
      background: C.bgWhite, borderRadius: 14, padding: 14,
      boxShadow: `0 1px 4px ${C.cardShadow}`, marginBottom: 16,
    },
    miniCalHeader: { display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', textAlign: 'center', marginBottom: 6 },
    miniCalDow: { fontSize: 11, fontWeight: 600, color: C.textSecondary },
    miniCalGrid: { display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2 },
    miniCalCell: { textAlign: 'center', padding: '6px 0', position: 'relative' },
    miniCalNum: { fontSize: 13, color: C.textPrimary },
    miniCalToday: {
      background: C.accent, color: 'white', borderRadius: '50%',
      width: 26, height: 26, display: 'inline-flex', alignItems: 'center',
      justifyContent: 'center', fontWeight: 700,
    },
    miniCalDot: {
      width: 4, height: 4, borderRadius: '50%', background: C.blue,
      margin: '2px auto 0',
    },

    /* sections */
    sectionHeader: {
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      marginBottom: 10, marginTop: 8,
    },
    sectionTitle: { fontSize: 15, fontWeight: 700, color: C.primary },
    sectionAdd: {
      background: C.primary, color: isDark ? '#1a1a1a' : C.headerText, border: 'none',
      width: 28, height: 28, borderRadius: '50%', fontSize: 18,
      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: '-apple-system, sans-serif', lineHeight: 1,
    },

    /* goal row */
    goalRow: {
      display: 'flex', alignItems: 'center', padding: '10px 14px',
      background: C.bgWhite, borderRadius: 10, marginBottom: 4,
      boxShadow: `0 1px 2px ${C.cardShadow}`, cursor: 'pointer',
    },

    /* annual month grid */
    monthGrid: { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 },
    monthCard: {
      background: C.bgWhite, borderRadius: 12, padding: '14px 12px',
      textAlign: 'center', boxShadow: `0 1px 3px ${C.cardShadow}`,
      cursor: 'pointer', transition: 'transform 0.15s',
      border: '1.5px solid transparent',
    },
    monthCardCur: { borderColor: C.accent },
    monthCardName: { fontSize: 14, fontWeight: 700, color: C.primary, marginBottom: 4 },

    /* fab */
    fab: {
      position: 'fixed', bottom: 36, left: '50%', transform: 'translateX(-50%)',
      width: 52, height: 52, borderRadius: '50%',
      background: C.primary, color: isDark ? '#1a1a1a' : C.headerText, fontSize: 28,
      border: 'none', boxShadow: isDark ? '0 4px 14px rgba(0,0,0,0.5)' : '0 4px 14px rgba(44,36,22,0.3)',
      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: '-apple-system, sans-serif', lineHeight: 1, zIndex: 50,
    },

    /* overlay & modal */
    overlay: {
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
      zIndex: 100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    },
    modal: {
      background: C.bg, borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 430,
      maxHeight: '85vh', overflow: 'auto', padding: '0 20px 24px',
      animation: 'slideUp 0.3s ease',
      paddingBottom: 'env(safe-area-inset-bottom, 24px)',
      boxSizing: 'border-box',
    },
    modalHeader: {
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '18px 0 12px', borderBottom: `1px solid ${C.borderLight}`,
      position: 'sticky', top: 0, background: C.bg, zIndex: 1,
    },
    modalTitle: { fontSize: 17, fontWeight: 700, color: C.primary },
    modalClose: {
      background: 'none', border: 'none', fontSize: 18, color: C.textMuted,
      cursor: 'pointer', padding: 4,
    },
    modalBody: { padding: '16px 0', overflowY: 'auto' as const, maxHeight: 'calc(90vh - 60px)' },
    fieldLabel: {
      display: 'block', fontSize: 12, fontWeight: 600, color: C.textSecondary,
      marginTop: 14, marginBottom: 6,
    },
    input: {
      width: '100%', maxWidth: '100%', padding: '10px 14px', borderRadius: 10,
      border: `1.5px solid ${C.border}`, background: C.bgWhite,
      fontSize: 14, color: C.textPrimary, outline: 'none',
      fontFamily: '-apple-system, "Noto Sans KR", sans-serif',
      boxSizing: 'border-box', WebkitAppearance: 'none', appearance: 'none',
    },
    chipRow: { display: 'flex', gap: 5, flexWrap: 'wrap', overflow: 'hidden' },
    chip: {
      padding: '5px 8px', borderRadius: 8,
      border: `1.5px solid ${C.border}`, background: C.bgWhite,
      fontSize: 11, color: C.textSecondary, cursor: 'pointer',
      fontFamily: '-apple-system, "Noto Sans KR", sans-serif',
      transition: 'all 0.15s', whiteSpace: 'nowrap',
    },
    chipActive: {
      background: C.primary, borderColor: C.primary, color: isDark ? '#1a1a1a' : C.headerText,
    },
    saveBtn: {
      width: '100%', padding: 14, borderRadius: 12,
      background: C.primary, color: isDark ? '#1a1a1a' : C.headerText, border: 'none',
      fontSize: 15, fontWeight: 600, cursor: 'pointer',
      fontFamily: '-apple-system, "Noto Sans KR", sans-serif',
      boxSizing: 'border-box',
    },

    /* confirm dialog */
    confirmBox: {
      background: C.bgWhite, borderRadius: 16, padding: 24,
      textAlign: 'center', boxShadow: '0 8px 30px rgba(0,0,0,0.2)',
      margin: 'auto',
    },
    confirmCancel: {
      flex: 1, padding: '10px 20px', borderRadius: 10,
      border: `1.5px solid ${C.border}`, background: C.bgWhite,
      fontSize: 14, color: C.textSecondary, cursor: 'pointer',
      fontFamily: '-apple-system, sans-serif',
    },
    confirmDelete: {
      flex: 1, padding: '10px 20px', borderRadius: 10,
      border: 'none', background: C.accent, color: 'white',
      fontSize: 14, fontWeight: 600, cursor: 'pointer',
      fontFamily: '-apple-system, sans-serif',
    },

    /* gantt */
    ganttContainer: {
      overflow: 'auto', background: C.bgWhite, borderRadius: 14,
      boxShadow: `0 1px 4px ${C.cardShadow}`,
    },
    ganttHeader: {
      display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12,
    },
    ganttRow: {
      display: 'flex', alignItems: 'center', borderBottom: `1px solid ${C.borderLight}`,
      minHeight: 36,
    },
    ganttLabel: {
      width: 120, minWidth: 120, padding: '6px 8px', fontSize: 12,
      color: C.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis',
      whiteSpace: 'nowrap', borderRight: `1px solid ${C.borderLight}`,
      flexShrink: 0,
    },
    ganttTimeline: {
      flex: 1, position: 'relative', height: 28, overflow: 'hidden',
    },
    ganttBar: {
      position: 'absolute', top: 4, height: 20, borderRadius: 4,
      minWidth: 8, cursor: 'pointer', transition: 'opacity 0.15s',
    },
    ganttDayHeader: {
      display: 'flex', borderBottom: `1px solid ${C.border}`,
    },
    ganttDayCell: {
      textAlign: 'center', fontSize: 9, color: C.textMuted,
      borderRight: `1px solid ${C.borderLight}`,
      padding: '4px 0',
    },

    /* settings */
    settingsSection: {
      background: C.bgWhite, borderRadius: 14, padding: 16, marginBottom: 12,
      boxShadow: `0 1px 4px ${C.cardShadow}`,
    },
    settingsLabel: {
      fontSize: 13, fontWeight: 600, color: C.textSecondary, marginBottom: 8,
    },
    dangerBtn: {
      padding: '10px 20px', borderRadius: 10,
      border: 'none', background: C.accent, color: 'white',
      fontSize: 13, fontWeight: 600, cursor: 'pointer',
      fontFamily: '-apple-system, sans-serif',
    },
    successBtn: {
      padding: '10px 20px', borderRadius: 10,
      border: 'none', background: C.green, color: 'white',
      fontSize: 13, fontWeight: 600, cursor: 'pointer',
      fontFamily: '-apple-system, sans-serif',
    },

    /* dark mode toggle */
    darkModeToggle: {
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '8px 0',
    },
    toggleSwitch: {
      width: 44, height: 24, borderRadius: 12, padding: 2,
      cursor: 'pointer', border: 'none',
      background: isDark ? C.accent : '#ccc',
      position: 'relative', transition: 'background 0.2s',
    },
    toggleKnob: {
      width: 20, height: 20, borderRadius: '50%', background: 'white',
      transition: 'transform 0.2s',
      transform: isDark ? 'translateX(20px)' : 'translateX(0)',
    },
  };
}

// Default light-mode styles for backward compatibility
export const styles: Styles = getStyles(false);

// Module-level mutable styles that can be updated for dark mode
let _currentStyles: Styles = styles;

export function setDarkMode(isDark: boolean): void {
  _currentStyles = getStyles(isDark);
}

export function getCurrentStyles(): Styles {
  return _currentStyles;
}
