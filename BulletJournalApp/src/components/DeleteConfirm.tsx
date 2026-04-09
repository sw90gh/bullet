import React from 'react';
import { useTheme } from '../hooks/useDarkModeContext';

interface DeleteConfirmProps {
  onCancel: () => void;
  onDelete: () => void;
}

export function DeleteConfirm({ onCancel, onDelete }: DeleteConfirmProps) {
  const { styles, C } = useTheme();
  return (
    <div style={styles.overlay} onClick={onCancel}>
      <div style={styles.confirmBox} onClick={e => e.stopPropagation()}>
        <p style={{ fontSize: 15, color: C.textPrimary, marginBottom: 16 }}>정말 삭제할까요?</p>
        <div style={{ display: 'flex', gap: 10 }}>
          <button style={styles.confirmCancel} onClick={onCancel}>취소</button>
          <button style={styles.confirmDelete} onClick={onDelete}>삭제</button>
        </div>
      </div>
    </div>
  );
}
