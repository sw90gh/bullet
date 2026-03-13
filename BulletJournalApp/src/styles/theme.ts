import { CSSProperties } from 'react';
import { COLORS } from '../utils/constants';

type Styles = Record<string, CSSProperties>;

export const styles: Styles = {
  app: {
    maxWidth: 430,
    margin: '0 auto',
    minHeight: '100vh',
    background: COLORS.bg,
    fontFamily: '-apple-system, "Noto Sans KR", sans-serif',
    position: 'relative',
    paddingBottom: 80,
    overflowX: 'hidden',
  },
  loadingWrap: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    height: '100vh', background: COLORS.bg,
  },
  loadingDot: { fontSize: 48, fontWeight: 800, color: COLORS.primary, animation: 'pulse 1.5s infinite' },

  /* header */
  header: {
    background: COLORS.headerBg,
    padding: '14px 20px 0',
    borderRadius: '0 0 20px 20px',
    paddingTop: 'env(safe-area-inset-top, 14px)',
  },
  headerTop: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8,
  },
  logo: {
    fontSize: 22, fontWeight: 700, color: COLORS.headerText, letterSpacing: 4,
    fontFamily: 'Georgia, serif',
  },
  headerActions: {
    display: 'flex', gap: 8, alignItems: 'center',
  },
  todayBtn: {
    background: 'rgba(250,246,240,0.15)', border: '1px solid rgba(250,246,240,0.25)',
    color: COLORS.headerText, fontSize: 12, padding: '5px 14px', borderRadius: 14,
    fontFamily: '-apple-system, sans-serif', cursor: 'pointer',
  },
  settingsBtn: {
    background: 'rgba(250,246,240,0.15)', border: '1px solid rgba(250,246,240,0.25)',
    color: COLORS.headerText, fontSize: 14, padding: '4px 10px', borderRadius: 14,
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
    color: COLORS.headerText, fontSize: 17, fontWeight: 600, minWidth: 150, textAlign: 'center',
  },

  /* tabs */
  tabBar: {
    display: 'flex', padding: '12px 16px 4px', gap: 6, overflowX: 'auto',
  },
  tab: {
    flex: 1, padding: '9px 0', borderRadius: 10, minWidth: 'fit-content',
    background: 'transparent', border: `1.5px solid ${COLORS.border}`,
    fontSize: 13, fontWeight: 500, color: COLORS.textSecondary,
    cursor: 'pointer', fontFamily: '-apple-system, "Noto Sans KR", sans-serif',
    transition: 'all 0.2s',
  },
  tabActive: {
    background: COLORS.primary, borderColor: COLORS.primary, color: COLORS.headerText,
  },

  /* main */
  main: { padding: '12px 16px' },

  /* today badge */
  todayBadge: {
    display: 'inline-block', background: COLORS.accent, color: 'white',
    fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 8,
    letterSpacing: 1.5, marginBottom: 12,
  },

  /* empty state */
  emptyState: { textAlign: 'center', padding: '48px 20px' },
  emptyAdd: {
    marginTop: 16, background: 'none', border: `1.5px dashed ${COLORS.textLight}`,
    color: COLORS.textSecondary, fontSize: 13, padding: '8px 20px', borderRadius: 10,
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
    flex: 1, background: COLORS.blue, color: 'white', border: 'none', fontSize: 13,
    fontWeight: 600, cursor: 'pointer', fontFamily: '-apple-system, sans-serif',
  },
  swipeDelete: {
    flex: 1, background: COLORS.accent, color: 'white', border: 'none', fontSize: 13,
    fontWeight: 600, cursor: 'pointer', fontFamily: '-apple-system, sans-serif',
  },
  entryRow: {
    display: 'flex', alignItems: 'center', gap: 8,
    background: 'white', padding: '12px 14px', borderRadius: 12,
    boxShadow: `0 1px 3px ${COLORS.cardShadow}`,
    cursor: 'pointer', position: 'relative', zIndex: 1,
  },
  prMark: { fontSize: 14, fontWeight: 700, flexShrink: 0 },
  entrySym: { fontSize: 22, fontWeight: 800, width: 20, textAlign: 'center', flexShrink: 0, lineHeight: 1 },
  entryText: { fontSize: 14, lineHeight: 1.5 },
  timeTag: {
    display: 'inline-block', fontSize: 11, color: COLORS.textMuted, marginLeft: 6,
    background: '#f5f0e8', padding: '1px 6px', borderRadius: 4,
  },
  statusBadge: {
    fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 6,
    whiteSpace: 'nowrap', flexShrink: 0,
  },
  notionBadge: {
    fontSize: 9, color: COLORS.blue, marginLeft: 4,
  },

  /* weekly */
  weekDay: {
    marginBottom: 4, background: 'white', borderRadius: 12,
    padding: '10px 14px', boxShadow: `0 1px 3px rgba(44,36,22,0.05)`,
  },
  weekDayToday: { borderLeft: `3px solid ${COLORS.accent}` },
  weekDayHeader: {
    display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, cursor: 'pointer',
  },
  weekDayName: { fontSize: 14, fontWeight: 700 },
  weekDayNum: { fontSize: 13, color: COLORS.textSecondary, fontWeight: 500 },
  weekDayNumToday: {
    background: COLORS.accent, color: 'white', borderRadius: '50%',
    width: 22, height: 22, display: 'inline-flex', alignItems: 'center',
    justifyContent: 'center', fontSize: 12, fontWeight: 700,
  },
  weekAddBtn: {
    background: 'none', border: `1px solid ${COLORS.border}`, color: COLORS.textMuted,
    width: 24, height: 24, borderRadius: '50%', fontSize: 16, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1,
    fontFamily: '-apple-system, sans-serif',
  },
  weekEntry: {
    display: 'flex', alignItems: 'center', padding: '3px 0 3px 28px', cursor: 'pointer',
  },

  /* monthly */
  miniCal: {
    background: 'white', borderRadius: 14, padding: 14,
    boxShadow: `0 1px 4px ${COLORS.cardShadow}`, marginBottom: 16,
  },
  miniCalHeader: { display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', textAlign: 'center', marginBottom: 6 },
  miniCalDow: { fontSize: 11, fontWeight: 600 },
  miniCalGrid: { display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2 },
  miniCalCell: { textAlign: 'center', padding: '6px 0', position: 'relative' },
  miniCalNum: { fontSize: 13, color: '#3d3427' },
  miniCalToday: {
    background: COLORS.accent, color: 'white', borderRadius: '50%',
    width: 26, height: 26, display: 'inline-flex', alignItems: 'center',
    justifyContent: 'center', fontWeight: 700,
  },
  miniCalDot: {
    width: 4, height: 4, borderRadius: '50%', background: COLORS.blue,
    margin: '2px auto 0',
  },

  /* sections */
  sectionHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 10, marginTop: 8,
  },
  sectionTitle: { fontSize: 15, fontWeight: 700, color: COLORS.primary },
  sectionAdd: {
    background: COLORS.primary, color: COLORS.headerText, border: 'none',
    width: 28, height: 28, borderRadius: '50%', fontSize: 18,
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: '-apple-system, sans-serif', lineHeight: 1,
  },

  /* goal row */
  goalRow: {
    display: 'flex', alignItems: 'center', padding: '10px 14px',
    background: 'white', borderRadius: 10, marginBottom: 4,
    boxShadow: `0 1px 2px rgba(44,36,22,0.04)`, cursor: 'pointer',
  },

  /* annual month grid */
  monthGrid: { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 },
  monthCard: {
    background: 'white', borderRadius: 12, padding: '14px 12px',
    textAlign: 'center', boxShadow: `0 1px 3px rgba(44,36,22,0.05)`,
    cursor: 'pointer', transition: 'transform 0.15s',
    border: '1.5px solid transparent',
  },
  monthCardCur: { borderColor: COLORS.accent },
  monthCardName: { fontSize: 14, fontWeight: 700, color: COLORS.primary, marginBottom: 4 },

  /* fab */
  fab: {
    position: 'fixed', bottom: 36, right: 'calc(50% - 180px)',
    width: 52, height: 52, borderRadius: '50%',
    background: COLORS.primary, color: COLORS.headerText, fontSize: 28,
    border: 'none', boxShadow: '0 4px 14px rgba(44,36,22,0.3)',
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: '-apple-system, sans-serif', lineHeight: 1, zIndex: 50,
  },

  /* overlay & modal */
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
    zIndex: 100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
  },
  modal: {
    background: COLORS.bg, borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 430,
    maxHeight: '85vh', overflow: 'auto', padding: '0 20px 24px',
    animation: 'slideUp 0.3s ease',
    paddingBottom: 'env(safe-area-inset-bottom, 24px)',
    boxSizing: 'border-box',
  },
  modalHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '18px 0 12px', borderBottom: `1px solid ${COLORS.borderLight}`,
    position: 'sticky', top: 0, background: COLORS.bg, zIndex: 1,
  },
  modalTitle: { fontSize: 17, fontWeight: 700, color: COLORS.primary },
  modalClose: {
    background: 'none', border: 'none', fontSize: 18, color: COLORS.textMuted,
    cursor: 'pointer', padding: 4,
  },
  modalBody: { padding: '16px 0', overflow: 'hidden' },
  fieldLabel: {
    display: 'block', fontSize: 12, fontWeight: 600, color: COLORS.textSecondary,
    marginTop: 14, marginBottom: 6,
  },
  input: {
    width: '100%', maxWidth: '100%', padding: '10px 14px', borderRadius: 10,
    border: `1.5px solid ${COLORS.border}`, background: 'white',
    fontSize: 14, color: COLORS.primary, outline: 'none',
    fontFamily: '-apple-system, "Noto Sans KR", sans-serif',
    boxSizing: 'border-box', WebkitAppearance: 'none', appearance: 'none',
  },
  chipRow: { display: 'flex', gap: 5, flexWrap: 'wrap', overflow: 'hidden' },
  chip: {
    padding: '5px 8px', borderRadius: 8,
    border: `1.5px solid ${COLORS.border}`, background: 'white',
    fontSize: 11, color: COLORS.textSecondary, cursor: 'pointer',
    fontFamily: '-apple-system, "Noto Sans KR", sans-serif',
    transition: 'all 0.15s', whiteSpace: 'nowrap',
  },
  chipActive: {
    background: COLORS.primary, borderColor: COLORS.primary, color: COLORS.headerText,
  },
  saveBtn: {
    width: '100%', padding: 14, borderRadius: 12,
    background: COLORS.primary, color: COLORS.headerText, border: 'none',
    fontSize: 15, fontWeight: 600, cursor: 'pointer',
    fontFamily: '-apple-system, "Noto Sans KR", sans-serif',
    boxSizing: 'border-box',
  },

  /* confirm dialog */
  confirmBox: {
    background: 'white', borderRadius: 16, padding: 24,
    textAlign: 'center', boxShadow: '0 8px 30px rgba(0,0,0,0.2)',
    margin: 'auto',
  },
  confirmCancel: {
    flex: 1, padding: '10px 20px', borderRadius: 10,
    border: `1.5px solid ${COLORS.border}`, background: 'white',
    fontSize: 14, color: COLORS.textSecondary, cursor: 'pointer',
    fontFamily: '-apple-system, sans-serif',
  },
  confirmDelete: {
    flex: 1, padding: '10px 20px', borderRadius: 10,
    border: 'none', background: COLORS.accent, color: 'white',
    fontSize: 14, fontWeight: 600, cursor: 'pointer',
    fontFamily: '-apple-system, sans-serif',
  },

  /* gantt */
  ganttContainer: {
    overflow: 'auto', background: 'white', borderRadius: 14,
    boxShadow: `0 1px 4px ${COLORS.cardShadow}`,
  },
  ganttHeader: {
    display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12,
  },
  ganttRow: {
    display: 'flex', alignItems: 'center', borderBottom: `1px solid ${COLORS.borderLight}`,
    minHeight: 36,
  },
  ganttLabel: {
    width: 120, minWidth: 120, padding: '6px 8px', fontSize: 12,
    color: COLORS.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis',
    whiteSpace: 'nowrap', borderRight: `1px solid ${COLORS.borderLight}`,
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
    display: 'flex', borderBottom: `1px solid ${COLORS.border}`,
  },
  ganttDayCell: {
    textAlign: 'center', fontSize: 9, color: COLORS.textMuted,
    borderRight: `1px solid ${COLORS.borderLight}`,
    padding: '4px 0',
  },

  /* settings */
  settingsSection: {
    background: 'white', borderRadius: 14, padding: 16, marginBottom: 12,
    boxShadow: `0 1px 4px ${COLORS.cardShadow}`,
  },
  settingsLabel: {
    fontSize: 13, fontWeight: 600, color: COLORS.textSecondary, marginBottom: 8,
  },
  dangerBtn: {
    padding: '10px 20px', borderRadius: 10,
    border: 'none', background: COLORS.accent, color: 'white',
    fontSize: 13, fontWeight: 600, cursor: 'pointer',
    fontFamily: '-apple-system, sans-serif',
  },
  successBtn: {
    padding: '10px 20px', borderRadius: 10,
    border: 'none', background: COLORS.green, color: 'white',
    fontSize: 13, fontWeight: 600, cursor: 'pointer',
    fontFamily: '-apple-system, sans-serif',
  },
};
