import React, { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input, Select, Button, DatePicker, Pagination, Modal, Upload } from 'antd';
import {
  SearchOutlined,
  ReloadOutlined,
  FileAddOutlined,
  DownloadOutlined,
  AppstoreOutlined,
  BarChartOutlined,
  FolderOpenOutlined,
  GithubOutlined,
  LogoutOutlined,
  UserOutlined,
  CopyOutlined,
  DeleteOutlined,
  FileTextOutlined,
  ClockCircleOutlined,
  BranchesOutlined
} from '@ant-design/icons';
import {
  DocumentationResponse,
  RepositoryRequest,
  AnalysisHistory,
  GitHubAnalysisResponse,
  PaginatedResponse,
  FileInfo,
  FileUploadUrlResponse,
  FileDownloadUrlResponse,
  RepositoryPreview
} from '../types';
import { useApi } from '../hooks/useApi';
import { usePermissions } from '../hooks/usePermissions';
import SeoHead from '../components/SeoHead';
import { getRoleBadgeStyle, getRoleLabel, getStatusBadgeStyle } from '../utils/ui';
import { getApiErrorMessage, stringifyUnknown } from '../utils/apiErrors';

import 'github-markdown-css/github-markdown.css';

const { RangePicker } = DatePicker;
const MarkdownRenderer = lazy(() => import('../components/MarkdownRenderer'));

// Стили
const styles: { [key: string]: React.CSSProperties } = {
  container: {
    minHeight: '100vh',
    background: 'var(--gradient-page)'
  },
  loading: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    fontSize: '18px',
    color: 'var(--color-text-muted)'
  },
  header: {
    background: 'var(--gradient-brand-soft)',
    padding: '22px 40px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    boxShadow: 'var(--shadow-soft)',
    color: 'white'
  },
  title: {
    margin: 0,
    fontSize: '24px',
    fontWeight: '600',
    color: 'white',
    cursor: 'pointer'
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
    flexWrap: 'wrap'
  },
  userName: {
    fontWeight: '600',
    fontSize: '16px'
  },
  roleBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px'
  },
  logoutButton: {
    padding: '10px 18px',
    background: 'var(--color-danger)',
    color: 'white',
    border: 'none',
    borderRadius: 'var(--radius-pill)',
    cursor: 'pointer',
    fontWeight: '700',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  profileButton: {
    padding: '10px 18px',
    background: 'rgba(255,255,255,0.14)',
    color: 'white',
    border: '1px solid rgba(255,255,255,0.18)',
    borderRadius: 'var(--radius-pill)',
    cursor: 'pointer',
    fontWeight: '700',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  adminButton: {
    padding: '10px 18px',
    background: 'var(--color-accent-500)',
    color: 'var(--color-brand-900)',
    border: 'none',
    borderRadius: 'var(--radius-pill)',
    cursor: 'pointer',
    fontWeight: '700',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  content: {
    padding: '30px',
    maxWidth: '1200px',
    margin: '0 auto'
  },
  tabs: {
    display: 'flex',
    gap: '0',
    marginBottom: '20px',
    background: 'rgba(255,255,255,0.96)',
    borderRadius: 'var(--radius-card)',
    padding: '6px',
    boxShadow: 'var(--shadow-soft)',
    border: '1px solid var(--color-border)'
  },
  tab: {
    padding: '12px 24px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '700',
    color: 'var(--color-text-muted)',
    borderRadius: '14px',
    flex: 1,
    textAlign: 'center' as const,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '8px'
  },
  tabActive: {
    background: 'var(--color-surface-tint)',
    color: 'var(--color-brand-900)'
  },
  tabContent: {
    background: 'rgba(255,255,255,0.96)',
    padding: '30px',
    borderRadius: 'var(--radius-card)',
    boxShadow: 'var(--shadow-card)',
    border: '1px solid var(--color-border)',
    minHeight: '400px'
  },
  form: {
    maxWidth: '600px',
    margin: '0 auto'
  },
  formGroup: {
    marginBottom: '20px'
  },
  label: {
    display: 'block',
    marginBottom: '8px',
    fontWeight: '700',
    color: 'var(--color-brand-800)',
    fontSize: '13px',
    letterSpacing: '0.02em'
  },
  input: {
    width: '100%',
    padding: '14px 16px',
    border: '1px solid var(--color-border)',
    borderRadius: '14px',
    fontSize: '14px',
    boxSizing: 'border-box' as const,
    background: 'var(--color-surface)',
    color: 'var(--color-brand-900)'
  },
  checkboxGroup: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
    gap: '10px',
    marginTop: '10px'
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    cursor: 'pointer',
    padding: '10px 12px',
    background: 'var(--color-surface-soft)',
    borderRadius: '14px',
    border: '1px solid var(--color-border)',
    color: 'var(--color-brand-800)',
    fontWeight: 600
  },
  checkboxLabelChecked: {
    background: 'var(--color-surface-tint)',
    border: '1px solid rgba(31, 78, 121, 0.26)'
  },
  checkbox: {
    margin: 0
  },
  analyzeButton: {
    padding: '14px 24px',
    background: 'var(--gradient-brand-soft)',
    color: 'white',
    border: 'none',
    borderRadius: '14px',
    fontSize: '16px',
    cursor: 'pointer',
    fontWeight: '700',
    width: '100%',
    marginTop: '20px'
  },
  analyzeButtonDisabled: {
    background: '#95a5a6',
    cursor: 'not-allowed'
  },
  previewActions: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    alignItems: 'center',
    gap: '12px',
    marginBottom: '16px'
  },
  previewButton: {
    padding: '12px 18px',
    background: 'var(--color-brand-800)',
    color: 'white',
    border: 'none',
    borderRadius: '14px',
    cursor: 'pointer',
    fontWeight: '700',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px'
  },
  previewButtonDisabled: {
    background: '#95a5a6',
    cursor: 'not-allowed'
  },
  helperText: {
    color: 'var(--color-text-muted)',
    fontSize: '13px',
    lineHeight: 1.5
  },
  previewCard: {
    minHeight: '210px',
    background: 'var(--color-surface-soft)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    padding: '20px',
    marginBottom: '20px',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.72)'
  },
  previewHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '12px',
    alignItems: 'flex-start',
    flexWrap: 'wrap' as const,
    marginBottom: '16px'
  },
  previewNameBlock: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '6px'
  },
  previewName: {
    margin: 0,
    color: 'var(--color-brand-900)'
  },
  previewRepoLink: {
    color: 'var(--color-brand-600)',
    textDecoration: 'none',
    fontWeight: '700'
  },
  previewDescription: {
    margin: '0 0 18px 0',
    color: 'var(--color-text-muted)',
    lineHeight: 1.6
  },
  previewMetaGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
    gap: '12px',
    marginBottom: '18px'
  },
  previewMetaCard: {
    background: 'rgba(255,255,255,0.96)',
    borderRadius: '14px',
    padding: '14px',
    border: '1px solid var(--color-border)'
  },
  previewMetaLabel: {
    marginBottom: '6px',
    fontSize: '12px',
    color: 'var(--color-text-muted)',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.04em'
  },
  previewMetaValue: {
    fontSize: '18px',
    fontWeight: '700',
    color: 'var(--color-brand-900)'
  },
  previewTopics: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: '8px'
  },
  previewTopic: {
    padding: '6px 12px',
    background: 'var(--color-surface-tint)',
    color: 'var(--color-brand-600)',
    borderRadius: 'var(--radius-pill)',
    fontSize: '12px',
    fontWeight: '700'
  },
  previewState: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '170px',
    textAlign: 'center' as const,
    color: 'var(--color-text-muted)',
    lineHeight: 1.6,
    padding: '0 12px'
  },
  previewErrorBox: {
    background: 'rgba(207, 141, 42, 0.12)',
    border: '1px solid rgba(207, 141, 42, 0.22)',
    color: '#875814',
    borderRadius: '14px',
    padding: '18px'
  },
  previewArchivedBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '7px 12px',
    background: 'rgba(242, 156, 80, 0.18)',
    border: '1px solid rgba(242, 156, 80, 0.28)',
    borderRadius: 'var(--radius-pill)',
    color: '#8a541b',
    fontSize: '12px',
    fontWeight: '700'
  },
  permissionDenied: {
    textAlign: 'center' as const,
    padding: '40px',
    background: 'var(--color-surface-soft)',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--color-border)'
  },
  projectsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
    gap: '20px'
  },
  projectCard: {
    background: 'rgba(255,255,255,0.96)',
    padding: '20px',
    borderRadius: '20px',
    border: '1px solid var(--color-border)',
    boxShadow: 'var(--shadow-soft)',
    position: 'relative'
  },
  projectName: {
    margin: '0 0 10px 0',
    color: 'var(--color-brand-900)',
    fontSize: '18px',
    fontWeight: '600'
  },
  projectUrl: {
    color: 'var(--color-text-muted)',
    fontSize: '14px',
    margin: '0 0 15px 0',
    wordBreak: 'break-all' as const
  },
  projectMeta: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap' as const,
    fontSize: '12px',
    color: 'var(--color-text-muted)',
    marginBottom: '15px'
  },
  projectStats: {
    display: 'flex',
    gap: '10px',
    alignItems: 'center'
  },
  projectActions: {
    display: 'flex',
    gap: '10px',
    marginTop: '15px'
  },
  projectButton: {
    flex: 1,
    padding: '12px',
    background: 'var(--gradient-brand-soft)',
    color: 'white',
    border: 'none',
    borderRadius: '14px',
    cursor: 'pointer',
    fontWeight: '700'
  },
  deleteButton: {
    padding: '10px',
    background: 'var(--color-danger)',
    color: 'white',
    border: 'none',
    borderRadius: '14px',
    cursor: 'pointer',
    fontWeight: '600',
    minWidth: '40px'
  },
  deleteButtonDisabled: {
    background: '#95a5a6',
    cursor: 'not-allowed'
  },
  resultsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px'
  },
  resultCard: {
    border: '1px solid var(--color-border)',
    borderRadius: '20px',
    overflow: 'hidden',
    background: 'rgba(255,255,255,0.96)',
    boxShadow: 'var(--shadow-soft)'
  },
  resultHeader: {
    background: 'var(--color-surface-soft)',
    padding: '15px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid var(--color-border)',
    flexWrap: 'wrap' as const,
    gap: '10px'
  },
  filePath: {
    fontFamily: 'var(--font-mono)',
    fontSize: '14px',
    color: 'var(--color-brand-900)',
    fontWeight: '600'
  },
  fileInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    flexWrap: 'wrap' as const
  },
  fileStatus: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px'
  },
  markdownViewer: {
    maxHeight: '400px',
    overflowY: 'auto',
    padding: '20px',
    background: 'var(--color-surface-soft)',
    borderRadius: '14px',
    border: '1px solid var(--color-border)'
  },
  errorMessage: {
    color: 'var(--color-danger)',
    background: 'rgba(200, 92, 68, 0.08)',
    padding: '10px',
    borderRadius: '12px',
    margin: '10px 15px',
    border: '1px solid rgba(200, 92, 68, 0.16)'
  },
  noResults: {
    textAlign: 'center',
    color: 'var(--color-text-muted)',
    padding: '40px 20px'
  },
  functionsSection: {
    padding: '15px',
    background: 'var(--color-surface-soft)',
    borderTop: '1px solid var(--color-border)'
  },
  functionsTitle: {
    margin: '0 0 10px 0',
    color: 'var(--color-brand-900)',
    fontSize: '14px',
    fontWeight: '600'
  },
  functionsList: {
    margin: 0,
    paddingLeft: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '5px'
  },
  functionItem: {
    color: 'var(--color-brand-800)',
    fontSize: '13px',
    lineHeight: '1.4'
  },
  loadingSpinner: {
    display: 'inline-block',
    width: '16px',
    height: '16px',
    border: '2px solid #f3f3f3',
    borderTop: '2px solid var(--color-accent-500)',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginRight: '8px'
  },
  confirmationDialog: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000
  },
  confirmationContent: {
    background: 'rgba(255,255,255,0.98)',
    padding: '30px',
    borderRadius: 'var(--radius-card)',
    maxWidth: '400px',
    width: '90%',
    boxShadow: 'var(--shadow-deep)',
    border: '1px solid var(--color-border)'
  },
  confirmationText: {
    marginBottom: '20px',
    fontSize: '16px',
    color: 'var(--color-brand-900)',
    lineHeight: '1.5'
  },
  confirmationButtons: {
    display: 'flex',
    gap: '10px',
    justifyContent: 'flex-end'
  },
  confirmButton: {
    padding: '10px 20px',
    background: 'var(--color-danger)',
    color: 'white',
    border: 'none',
    borderRadius: '14px',
    cursor: 'pointer',
    fontWeight: '600'
  },
  cancelButton: {
    padding: '10px 20px',
    background: 'var(--color-surface-soft)',
    color: 'var(--color-brand-800)',
    border: '1px solid var(--color-border)',
    borderRadius: '14px',
    cursor: 'pointer',
    fontWeight: '600'
  },
  notificationContainer: {
    position: 'fixed',
    top: '20px',
    right: '20px',
    zIndex: 1001,
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    maxWidth: '400px'
  },
  notification: {
    padding: '15px 20px',
    borderRadius: '16px',
    boxShadow: 'var(--shadow-soft)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    animation: 'slideIn 0.3s ease-out',
    maxWidth: '400px'
  },
  notificationSuccess: {
    background: 'rgba(47, 143, 104, 0.12)',
    border: '1px solid rgba(47, 143, 104, 0.18)',
    color: '#1b6c4e'
  },
  notificationError: {
    background: 'rgba(200, 92, 68, 0.1)',
    border: '1px solid rgba(200, 92, 68, 0.16)',
    color: '#7a2f21'
  },
  notificationWarning: {
    background: 'rgba(207, 141, 42, 0.12)',
    border: '1px solid rgba(207, 141, 42, 0.18)',
    color: '#8a5a18'
  },
  notificationInfo: {
    background: 'rgba(47, 121, 186, 0.12)',
    border: '1px solid rgba(47, 121, 186, 0.18)',
    color: '#1f5b8b'
  },
  notificationMessage: {
    flex: 1,
    marginRight: '15px',
    fontSize: '14px',
    fontWeight: '500'
  },
  closeNotificationButton: {
    background: 'transparent',
    border: 'none',
    color: 'inherit',
    cursor: 'pointer',
    fontSize: '18px',
    fontWeight: 'bold',
    opacity: 0.7,
    padding: '0',
    width: '24px',
    height: '24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  validationError: {
    color: 'var(--color-danger)',
    fontSize: '12px',
    marginTop: '5px',
    display: 'block'
  },
  tabBadge: {
    backgroundColor: 'rgba(23, 50, 77, 0.08)',
    borderRadius: '12px',
    padding: '2px 8px',
    fontSize: '11px',
    fontWeight: 'bold',
    minWidth: '20px'
  },
  copyButton: {
    padding: '6px 12px',
    background: 'var(--color-brand-800)',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  },
  statsContainer: {
    background: 'var(--color-surface-soft)',
    padding: '15px',
    borderRadius: '20px',
    marginBottom: '20px',
    border: '1px solid var(--color-border)'
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '15px',
    marginTop: '15px'
  },
  statCard: {
    background: 'rgba(255,255,255,0.96)',
    padding: '15px',
    borderRadius: '14px',
    boxShadow: 'var(--shadow-soft)',
    textAlign: 'center'
  },
  statLabel: {
    fontSize: '12px',
    color: 'var(--color-text-muted)',
    marginBottom: '5px'
  },
  statValue: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: 'var(--color-brand-900)'
  },
  filterBar: {
    background: 'rgba(255,255,255,0.96)',
    padding: '16px',
    borderRadius: '20px',
    marginBottom: '20px',
    boxShadow: 'var(--shadow-soft)',
    border: '1px solid var(--color-border)'
  },
  filterRow: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: '12px',
    alignItems: 'flex-end'
  },
  filterItem: {
    flex: '1 1 200px'
  },
  filterLabel: {
    display: 'block',
    marginBottom: '4px',
    fontSize: '12px',
    color: 'var(--color-text-muted)',
    fontWeight: 700,
    letterSpacing: '0.03em'
  },
  paginationContainer: {
    display: 'flex',
    justifyContent: 'center',
    marginTop: '24px',
    padding: '16px'
  }
};

// CSS анимация
const spinnerStyle = `
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}
`;

interface FileTypeCheckboxProps {
  type: string;
  checked: boolean;
  onChange: (type: string) => void;
}

const FileTypeCheckbox: React.FC<FileTypeCheckboxProps> = ({
  type,
  checked,
  onChange
}) => (
  <label
    style={{
      ...styles.checkboxLabel,
      ...(checked && styles.checkboxLabelChecked)
    }}
    onClick={() => onChange(type)}
  >
    <input
      type="checkbox"
      checked={checked}
      onChange={() => {}}
      style={styles.checkbox}
    />
    {type}
  </label>
);

interface Notification {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
}

interface FilterParams {
  repo_name?: string;
  status?: string;
  date_from?: string;
  date_to?: string;
  sort_by: string;
  sort_order: string;
  page: number;
  page_size: number;
}

const Dashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('analyze');
  const [repoUrl, setRepoUrl] = useState<string>('');
  const [branch, setBranch] = useState<string>('main');
  const [fileTypes, setFileTypes] = useState<string[]>(['.py', '.js', '.ts', '.java', '.cpp', '.go']);
  const [analysisResult, setAnalysisResult] = useState<DocumentationResponse[] | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [projects, setProjects] = useState<AnalysisHistory[]>([]);
  const [projectsLoading, setProjectsLoading] = useState<boolean>(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);
  const [projectToDelete, setProjectToDelete] = useState<AnalysisHistory | null>(null);
  const [validationError, setValidationError] = useState<string>('');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [repoPreview, setRepoPreview] = useState<RepositoryPreview | null>(null);
  const [repoPreviewLoading, setRepoPreviewLoading] = useState<boolean>(false);
  const [repoPreviewError, setRepoPreviewError] = useState<string>('');
  const [repoPreviewCache, setRepoPreviewCache] = useState<Record<string, RepositoryPreview>>({});

  // Состояния для фильтрации и пагинации
  const [filters, setFilters] = useState<FilterParams>({
    sort_by: 'created_at',
    sort_order: 'desc',
    page: 1,
    page_size: 10
  });
  const [paginatedProjects, setPaginatedProjects] = useState<PaginatedResponse<AnalysisHistory> | null>(null);

  // Состояния для работы с файлами
  const [selectedProject, setSelectedProject] = useState<AnalysisHistory | null>(null);
  const [fileModalVisible, setFileModalVisible] = useState(false);
  const [projectFiles, setProjectFiles] = useState<FileInfo[]>([]);
  const [uploading, setUploading] = useState(false);
  const initialProjectsLoadedRef = useRef(false);

  const navigate = useNavigate();
  const api = useApi();

  // Хук для проверки прав
  const { user, loading: permissionsLoading, hasPermission, isAdmin, isOwner } = usePermissions();

  // Функция для добавления уведомлений
  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  }, []);

  const addNotification = useCallback((message: string, type: Notification['type'] = 'info', duration: number = 5000) => {
    const id = Date.now().toString();
    const newNotification: Notification = {
      id,
      message,
      type,
      duration
    };

    setNotifications(prev => [...prev, newNotification]);

    if (duration > 0) {
      setTimeout(() => {
        removeNotification(id);
      }, duration);
    }

    return id;
  }, [removeNotification]);

  // Загрузка проектов с фильтрацией
  const fetchProjectsWithFilters = useCallback(async (params: FilterParams) => {
    try {
      setProjectsLoading(true);
      const queryParams = new URLSearchParams({
        page: params.page.toString(),
        page_size: params.page_size.toString(),
        sort_by: params.sort_by,
        sort_order: params.sort_order
      });

      if (params.repo_name) queryParams.append('repo_name', params.repo_name);
      if (params.status) queryParams.append('status', params.status);
      if (params.date_from) queryParams.append('date_from', params.date_from);
      if (params.date_to) queryParams.append('date_to', params.date_to);

      const response = await api.get<PaginatedResponse<AnalysisHistory>>(`/api/analyses?${queryParams}`);
      setPaginatedProjects(response.data);
      setProjects(response.data.items);
    } catch (error: unknown) {
      addNotification(getApiErrorMessage(error, 'Ошибка загрузки проектов'), 'error');
    } finally {
      setProjectsLoading(false);
    }
  }, [addNotification, api]);

  // Загрузка файлов проекта
  const fetchProjectFiles = async (analysisId: number) => {
    try {
      const response = await api.get<FileInfo[]>(`/api/files?analysis_id=${analysisId}`);
      setProjectFiles(response.data);
    } catch (error: unknown) {
      addNotification(getApiErrorMessage(error, 'Ошибка загрузки файлов'), 'error');
    }
  };

  // Загрузка файла
  const handleFileUpload = async (file: File, analysisId: number) => {
    setUploading(true);
    try {
      // Добавлена типизация ответа
      const uploadUrlResponse = await api.post<FileUploadUrlResponse>('/api/files/upload-url', null, {
        params: {
          filename: file.name,
          content_type: file.type,
          analysis_id: analysisId
        }
      });

      const { file_id, upload_url } = uploadUrlResponse.data;

      await fetch(upload_url, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type
        }
      });

      await api.post(`/api/files/${file_id}/confirm`, {
        file_size: file.size
      });

      addNotification(`Файл "${file.name}" успешно загружен`, 'success');
      fetchProjectFiles(analysisId);
    } catch (error: unknown) {
      addNotification(`Ошибка загрузки файла: ${getApiErrorMessage(error, 'Не удалось загрузить файл')}`, 'error');
    } finally {
      setUploading(false);
    }
  };

  // Скачивание файла
  const handleFileDownload = async (file: FileInfo) => {
    try {
      // Добавлена типизация ответа
      const response = await api.get<FileDownloadUrlResponse>(`/api/files/${file.file_id}/download-url`);
      const { download_url, filename } = response.data;

      const link = document.createElement('a');
      link.href = download_url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      addNotification(`Файл "${filename}" скачивается`, 'success');
    } catch (error: unknown) {
      addNotification(`Ошибка скачивания: ${getApiErrorMessage(error, 'Не удалось скачать файл')}`, 'error');
    }
  };

  // Удаление файла
  const handleFileDelete = async (file: FileInfo) => {
    try {
      await api.delete(`/api/files/${file.file_id}`);
      addNotification(`Файл "${file.original_name}" удален`, 'success');
      fetchProjectFiles(file.analysis_id!);
    } catch (error: unknown) {
      addNotification(`Ошибка удаления: ${getApiErrorMessage(error, 'Не удалось удалить файл')}`, 'error');
    }
  };

  // Сброс фильтров
  const resetFilters = () => {
    const newFilters = {
      sort_by: 'created_at',
      sort_order: 'desc',
      page: 1,
      page_size: 10
    };
    setFilters(newFilters);
    fetchProjectsWithFilters(newFilters);
  };

  // Применение фильтров
  const applyFilters = () => {
    fetchProjectsWithFilters({ ...filters, page: 1 });
  };

  // Изменение страницы
  const handlePageChange = (page: number, pageSize: number) => {
    const newFilters = { ...filters, page, page_size: pageSize };
    setFilters(newFilters);
    fetchProjectsWithFilters(newFilters);
  };

  const getPreviewCacheKey = (value: string): string => value.trim().replace(/\/$/, '');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token && !permissionsLoading) {
      navigate('/login');
      return;
    }

    if (permissionsLoading || !user || initialProjectsLoadedRef.current) {
      return;
    }

    initialProjectsLoadedRef.current = true;
    fetchProjectsWithFilters(filters);
  }, [fetchProjectsWithFilters, filters, navigate, permissionsLoading, user]);

  useEffect(() => {
    const cacheKey = getPreviewCacheKey(repoUrl);

    if (!cacheKey) {
      setRepoPreview(null);
      setRepoPreviewError('');
      return;
    }

    const cachedPreview = repoPreviewCache[cacheKey];
    if (cachedPreview) {
      setRepoPreview(cachedPreview);
      setRepoPreviewError('');
      return;
    }

    setRepoPreview(null);
    setRepoPreviewError('');
  }, [repoPreviewCache, repoUrl]);

  const handlePreviewRepository = async (): Promise<void> => {
    if (!repoUrl.trim()) {
      setRepoPreview(null);
      setRepoPreviewError('Сначала укажите URL репозитория.');
      return;
    }

    try {
      new URL(repoUrl.trim());
    } catch {
      setRepoPreview(null);
      setRepoPreviewError('Введите корректный URL GitHub-репозитория.');
      return;
    }

    const cacheKey = getPreviewCacheKey(repoUrl);
    const cachedPreview = repoPreviewCache[cacheKey];

    if (cachedPreview) {
      setRepoPreview(cachedPreview);
      setRepoPreviewError('');
      if (!branch.trim() || branch === 'main') {
        setBranch(cachedPreview.default_branch);
      }
      return;
    }

    setRepoPreviewLoading(true);
    setRepoPreviewError('');

    try {
      const response = await api.get<RepositoryPreview>('/api/integrations/github/repository-preview', {
        params: {
          repo_url: repoUrl.trim()
        }
      });

      const preview = response.data;
      setRepoPreview(preview);
      setRepoPreviewCache((prev) => ({
        ...prev,
        [cacheKey]: preview
      }));

      if (!branch.trim() || branch === 'main') {
        setBranch(preview.default_branch);
      }
    } catch (error: unknown) {
      const errorMessage = getApiErrorMessage(error, 'Не удалось получить данные GitHub API.');
      setRepoPreview(null);
      setRepoPreviewError(errorMessage);
      addNotification(`${errorMessage} Анализ репозитория останется доступным без предпросмотра.`, 'warning');
    } finally {
      setRepoPreviewLoading(false);
    }
  };

  const handleAnalyze = async (): Promise<void> => {
    if (!repoUrl.trim()) {
      setValidationError('Пожалуйста, введите URL репозитория');
      return;
    }

    try {
      new URL(repoUrl);
    } catch {
      setValidationError('Пожалуйста, введите корректный URL');
      return;
    }

    setValidationError('');
    setLoading(true);
    setAnalysisResult(null);

    try {
      const normalizedBranch = branch.trim() || repoPreview?.default_branch || 'main';
      const requestData: RepositoryRequest = {
        repo_url: repoUrl.trim(),
        branch: normalizedBranch,
        file_types: fileTypes
      };

      setBranch(normalizedBranch);

      const response = await api.post<GitHubAnalysisResponse>('/api/analyze/github', requestData);
      const result = response.data;

      const processedResults = processBackendResponse(result);
      setAnalysisResult(processedResults);

      setTimeout(() => {
        setActiveTab('results');
      }, 100);

      addNotification(`Анализ завершен! Обработано ${processedResults.length} файлов`, 'success');
      fetchProjectsWithFilters(filters);

    } catch (error: unknown) {
      const errorMessage = getApiErrorMessage(error, 'Ошибка анализа');
      addNotification(`Ошибка анализа: ${errorMessage}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const processBackendResponse = (result: GitHubAnalysisResponse): DocumentationResponse[] => {
    if (!result || result.status === 'error' || !result.file_analyses) {
      return [];
    }

    return result.file_analyses.map((file, index) => ({
      id: `${result.history_id ?? extractRepoName(result.repo_url)}-${file.file_path || index}`,
      file_path: file.file_path || `file_${index}`,
      language: file.language || 'unknown',
      documentation: file.documentation || 'Документация не сгенерирована',
      ai_documentation: file.ai_documentation,
      functions: file.functions || [],
      confidence: file.confidence || 0,
      status: file.status || 'unknown',
      generation_time: file.generation_time,
      source: file.source,
      structure: file.structure,
      error: file.error
    }));
  };

  const extractRepoName = (url: string): string => {
    try {
      return url.split('/').pop()?.replace('.git', '') || 'unknown-repo';
    } catch {
      return 'unknown-repo';
    }
  };

  const handleLogout = (): void => {
    localStorage.removeItem('token');
    addNotification('Вы успешно вышли из системы', 'info');
    navigate('/login');
  };

  const toggleFileType = (type: string): void => {
    setFileTypes(prev =>
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  const safeRender = (value: unknown): string => {
    return stringifyUnknown(value);
  };

  const renderDocumentationContent = (file: DocumentationResponse): string => {
    if (!file) return 'Нет данных о файле';

    const sections: string[] = [];

    if (file.error) {
      sections.push(`**Ошибка:** ${file.error}`, '');
    }

    if (file.ai_documentation) {
      sections.push('### AI Анализ', '', file.ai_documentation, '');
    }

    sections.push(file.documentation || '*Документация не сгенерирована*');

    if (file.structure) {
      sections.push(
        '',
        '### Структура файла',
        '',
        `• **Строк:** ${file.structure.total_lines}`,
        `• **Функций:** ${file.structure.function_count}`,
        `• **Классов:** ${file.structure.class_count}`
      );
    }

    if (file.functions && file.functions.length > 0) {
      sections.push('', '### Функции и методы', '');
      file.functions.forEach((func, index) => {
        sections.push(`**${index + 1}. ${func.name}**`);
        if (func.params && func.params.length > 0) {
          sections.push(`   Параметры: ${func.params.join(', ')}`);
        }
        if (func.type) {
          sections.push(`   Тип: ${func.type}`);
        }
        if (func.line) {
          sections.push(`   Строка: ${func.line}`);
        }
        sections.push('');
      });
    }

    return sections.join('\n');
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStatusText = (status: string): string => {
    switch (status?.toLowerCase()) {
      case 'completed':
      case 'success': return 'Успешно';
      case 'processing': return 'В процессе';
      case 'failed':
      case 'error': return 'Ошибка';
      default: return status || 'Неизвестно';
    }
  };

  const confirmDelete = (project: AnalysisHistory): void => {
    setProjectToDelete(project);
    setShowDeleteConfirm(true);
  };

  const cancelDelete = (): void => {
    setProjectToDelete(null);
    setShowDeleteConfirm(false);
  };

  const deleteProject = async (): Promise<void> => {
    if (!projectToDelete) return;

    try {
      setDeletingId(projectToDelete.id);
      await api.delete(`/api/analyses/${projectToDelete.id}`);
      setProjects(prev => prev.filter(p => p.id !== projectToDelete.id));
      addNotification(`Проект "${projectToDelete.repo_name}" успешно удален`, 'success');
      fetchProjectsWithFilters(filters);
    } catch (error: unknown) {
      const errorMessage = getApiErrorMessage(error, 'Не удалось удалить анализ');
      addNotification(`Ошибка удаления: ${errorMessage}`, 'error');
    } finally {
      setDeletingId(null);
      setProjectToDelete(null);
      setShowDeleteConfirm(false);
    }
  };

  const handleTabClick = (tabId: string) => {
    setActiveTab(tabId);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
      .then(() => addNotification('Скопировано в буфер обмена', 'success'))
      .catch(() => addNotification('Ошибка копирования', 'error'));
  };

  const renderContentByViewMode = (content: string) => {
    return (
      <Suspense fallback={<div style={styles.markdownViewer}>Загружаем компонент просмотра документации...</div>}>
        <MarkdownRenderer
          content={content}
          className="markdown-body"
          style={styles.markdownViewer}
        />
      </Suspense>
    );
  };

  if (permissionsLoading) {
    return (
      <div style={styles.loading}>
        <style>{spinnerStyle}</style>
        <div style={styles.loadingSpinner}></div>
        Загрузка данных пользователя...
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div style={styles.container}>
      <SeoHead
        title="Личный кабинет | CodeDoc AI"
        description="Личный кабинет CodeDoc AI для анализа GitHub-репозиториев и просмотра результатов. Страница исключена из индексации."
        canonicalPath="/dashboard"
        noindex
        imageAlt="Личный кабинет CodeDoc AI"
      />
      <style>{spinnerStyle}</style>

      {/* Уведомления */}
      <div style={styles.notificationContainer}>
        {notifications.map(notification => (
          <div
            key={notification.id}
            style={{
              ...styles.notification,
              ...styles[`notification${notification.type.charAt(0).toUpperCase() + notification.type.slice(1)}`]
            }}
          >
            <div style={styles.notificationMessage}>
              {notification.message}
            </div>
            <button
              onClick={() => removeNotification(notification.id)}
              style={styles.closeNotificationButton}
              aria-label="Закрыть уведомление"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      {/* Диалог подтверждения удаления */}
      {showDeleteConfirm && projectToDelete && (
        <div style={styles.confirmationDialog}>
          <div style={styles.confirmationContent}>
            <p style={styles.confirmationText}>
              Вы уверены, что хотите удалить проект <strong>"{projectToDelete.repo_name}"</strong>?
              <br />
              <br />
              Эта операция необратима. Все данные анализа будут удалены.
            </p>
            <div style={styles.confirmationButtons}>
              <button onClick={cancelDelete} style={styles.cancelButton} disabled={deletingId === projectToDelete.id}>
                Отмена
              </button>
              <button
                onClick={deleteProject}
                style={{
                  ...styles.confirmButton,
                  ...(deletingId === projectToDelete.id && styles.deleteButtonDisabled)
                }}
                disabled={deletingId === projectToDelete.id}
              >
                {deletingId === projectToDelete.id ? (
                  <>
                    <div style={styles.loadingSpinner}></div>
                    Удаление...
                  </>
                ) : (
                  'Удалить'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <header style={styles.header} className="page-topbar workspace-header">
        <h1 style={styles.title} onClick={() => navigate('/dashboard')} title="Главная страница">
          CodeDoc AI
        </h1>
        <div style={styles.userInfo} className="workspace-user-row">
          <div className="workspace-role-stack" style={{ marginRight: '10px' }}>
            {user.roles?.map(role => (
              <span
                key={role.id}
                style={{
                  ...styles.roleBadge,
                  ...getRoleBadgeStyle(role.name)
                }}
              >
                {role.name === 'admin' ? <AppstoreOutlined /> : <UserOutlined />}
                {getRoleLabel(role.name)}
              </span>
            ))}
          </div>

          <span style={styles.userName}>Привет, {user.username}!</span>

          {isAdmin() && (
            <button onClick={() => navigate('/admin')} style={styles.adminButton}>
              <AppstoreOutlined />
              Админ панель
            </button>
          )}

          <button onClick={() => navigate('/profile')} style={styles.profileButton}>
            <UserOutlined />
            Профиль
          </button>
          <button onClick={handleLogout} style={styles.logoutButton}>
            <LogoutOutlined />
            Выйти
          </button>
        </div>
      </header>

      <div style={styles.content} className="workspace-content">
        <div style={styles.tabs} className="workspace-tabs">
          {[
            { id: 'analyze', label: 'Анализ репозитория', icon: <GithubOutlined /> },
            { id: 'projects', label: 'Мои проекты', icon: <FolderOpenOutlined />, count: projects.length },
            { id: 'results', label: 'Результаты', icon: <BarChartOutlined />, count: analysisResult?.length || 0 }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              style={{ ...styles.tab, ...(activeTab === tab.id && styles.tabActive) }}
              className="workspace-tab"
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>{tab.icon} {tab.label}</span>
              {(tab.count !== undefined && tab.count > 0) && (
                <span style={styles.tabBadge}>{tab.count}</span>
              )}
            </button>
          ))}
        </div>

        <div style={styles.tabContent}>
          {activeTab === 'analyze' && (
            <>
              <h2 style={{ marginBottom: '20px', color: 'var(--color-brand-900)' }}>Анализ GitHub репозитория</h2>

              {!hasPermission('analysis:create') ? (
                <div style={styles.permissionDenied}>
                  <h3 style={{ color: 'var(--color-danger)', marginBottom: '10px' }}>Недостаточно прав</h3>
                  <p style={{ color: 'var(--color-text-muted)' }}>
                    У вас нет прав для создания новых анализов. Обратитесь к администратору.
                  </p>
                </div>
              ) : (
                <div style={styles.form} className="workspace-form">
                  <div style={styles.formGroup}>
                    <label style={styles.label}>URL репозитория *</label>
                    <input
                      type="text"
                      value={repoUrl}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        setRepoUrl(e.target.value);
                        setValidationError('');
                        setRepoPreviewError('');
                      }}
                      placeholder="https://github.com/username/repository.git"
                      style={{ ...styles.input, ...(validationError && { borderColor: 'var(--color-danger)' }) }}
                    />
                    {validationError && <span style={styles.validationError}>{validationError}</span>}
                  </div>

                  <div style={styles.previewActions} className="workspace-preview-actions">
                    <button
                      onClick={handlePreviewRepository}
                      disabled={repoPreviewLoading || !repoUrl.trim()}
                      style={{
                        ...styles.previewButton,
                        ...((repoPreviewLoading || !repoUrl.trim()) && styles.previewButtonDisabled)
                      }}
                    >
                      <GithubOutlined />
                      {repoPreviewLoading ? 'Проверяем GitHub API...' : 'Проверить репозиторий'}
                    </button>
                    <span style={styles.helperText}>
                      Предпросмотр использует серверную интеграцию с GitHub API и не блокирует основной анализ при сбоях.
                    </span>
                  </div>

                  <section style={styles.previewCard} aria-live="polite">
                    {repoPreviewLoading ? (
                      <div style={styles.previewState}>
                        <div style={styles.loadingSpinner}></div>
                        Загружаем внешние данные о репозитории...
                      </div>
                    ) : repoPreview ? (
                      <>
                        <div style={styles.previewHeader}>
                          <div style={styles.previewNameBlock}>
                            <h3 style={styles.previewName}>{repoPreview.full_name}</h3>
                            <a
                              href={repoPreview.html_url}
                              target="_blank"
                              rel="noreferrer"
                              style={styles.previewRepoLink}
                            >
                              Открыть репозиторий на GitHub
                            </a>
                          </div>
                          {repoPreview.archived && (
                            <span style={styles.previewArchivedBadge}>
                              <FolderOpenOutlined />
                              Архивный репозиторий
                            </span>
                          )}
                        </div>

                        <p style={styles.previewDescription}>
                          {repoPreview.description || 'GitHub не вернул описание для этого репозитория.'}
                        </p>

                        <div style={styles.previewMetaGrid}>
                          <div style={styles.previewMetaCard}>
                            <div style={styles.previewMetaLabel}>Основная ветка</div>
                            <div style={styles.previewMetaValue}>{repoPreview.default_branch}</div>
                          </div>
                          <div style={styles.previewMetaCard}>
                            <div style={styles.previewMetaLabel}>Язык</div>
                            <div style={styles.previewMetaValue}>{repoPreview.primary_language || 'Не указан'}</div>
                          </div>
                          <div style={styles.previewMetaCard}>
                            <div style={styles.previewMetaLabel}>Stars</div>
                            <div style={styles.previewMetaValue}>{repoPreview.stars}</div>
                          </div>
                          <div style={styles.previewMetaCard}>
                            <div style={styles.previewMetaLabel}>Forks</div>
                            <div style={styles.previewMetaValue}>{repoPreview.forks}</div>
                          </div>
                          <div style={styles.previewMetaCard}>
                            <div style={styles.previewMetaLabel}>Issues</div>
                            <div style={styles.previewMetaValue}>{repoPreview.open_issues}</div>
                          </div>
                          <div style={styles.previewMetaCard}>
                            <div style={styles.previewMetaLabel}>Обновлен</div>
                            <div style={styles.previewMetaValue}>
                              {repoPreview.last_updated_at ? formatDate(repoPreview.last_updated_at) : 'Нет данных'}
                            </div>
                          </div>
                        </div>

                        {repoPreview.topics.length > 0 && (
                          <div style={styles.previewTopics}>
                            {repoPreview.topics.map((topic) => (
                              <span key={topic} style={styles.previewTopic}>{topic}</span>
                            ))}
                          </div>
                        )}
                      </>
                    ) : repoPreviewError ? (
                      <div style={styles.previewErrorBox}>
                        <h3 style={{ marginTop: 0, marginBottom: '10px' }}>Предпросмотр временно недоступен</h3>
                        <p style={{ margin: '0 0 10px 0', lineHeight: 1.6 }}>{repoPreviewError}</p>
                        <p style={{ margin: 0, lineHeight: 1.6 }}>
                          Это не блокирует основной сценарий: вы все равно можете запустить анализ вручную.
                        </p>
                      </div>
                    ) : (
                      <div style={styles.previewState}>
                        Введите URL GitHub-репозитория и нажмите «Проверить репозиторий», чтобы увидеть ветку,
                        язык, популярность и другие внешние данные до запуска анализа.
                      </div>
                    )}
                  </section>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>Ветка</label>
                    <input
                      type="text"
                      value={branch}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBranch(e.target.value)}
                      placeholder="main"
                      style={styles.input}
                    />
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>Типы файлов для анализа</label>
                    <div style={styles.checkboxGroup}>
                      {['.py', '.js', '.ts', '.java', '.cpp', '.c', '.go', '.php'].map((type) => (
                        <FileTypeCheckbox key={type} type={type} checked={fileTypes.includes(type)} onChange={toggleFileType} />
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={handleAnalyze}
                    disabled={loading || !repoUrl}
                    style={{ ...styles.analyzeButton, ...((loading || !repoUrl) && styles.analyzeButtonDisabled) }}
                  >
                    {loading ? (
                      <>
                        <div style={styles.loadingSpinner}></div>
                        Анализируем репозиторий...
                      </>
                    ) : (
                      'Начать анализ'
                    )}
                  </button>
                </div>
              )}
            </>
          )}

          {activeTab === 'projects' && (
            <>
              <h2 style={{ marginBottom: '20px', color: 'var(--color-brand-900)' }}>История анализов</h2>

              {/* Панель фильтров */}
              <div style={styles.filterBar} className="workspace-filter-bar">
                <div style={styles.filterRow} className="workspace-filter-row">
                  <div style={styles.filterItem}>
                    <div style={styles.filterLabel}>Название репозитория</div>
                    <Input
                      placeholder="Поиск по названию"
                      allowClear
                      value={filters.repo_name}
                      onChange={(e) => setFilters({ ...filters, repo_name: e.target.value })}
                      prefix={<SearchOutlined />}
                      onPressEnter={applyFilters}
                    />
                  </div>

                  <div style={styles.filterItem}>
                    <div style={styles.filterLabel}>Статус</div>
                    <Select
                      placeholder="Все статусы"
                      allowClear
                      style={{ width: '100%' }}
                      value={filters.status}
                      onChange={(value) => setFilters({ ...filters, status: value })}
                      options={[
                        { value: 'completed', label: 'Завершен' },
                        { value: 'processing', label: 'В обработке' },
                        { value: 'failed', label: 'Ошибка' }
                      ]}
                    />
                  </div>

                  <div style={styles.filterItem}>
                    <div style={styles.filterLabel}>Период</div>
                    <RangePicker
                      style={{ width: '100%' }}
                      onChange={(dates) => {
                        if (dates && dates[0] && dates[1]) {
                          setFilters({
                            ...filters,
                            date_from: dates[0].toISOString(),
                            date_to: dates[1].toISOString()
                          });
                        } else {
                          setFilters({ ...filters, date_from: undefined, date_to: undefined });
                        }
                      }}
                    />
                  </div>

                  <div style={styles.filterItem}>
                    <div style={styles.filterLabel}>Сортировка</div>
                    <Select
                      style={{ width: '100%' }}
                      value={`${filters.sort_by}_${filters.sort_order}`}
                      onChange={(value) => {
                          const lastUnderscoreIndex = value.lastIndexOf('_');
                          const sort_by = value.substring(0, lastUnderscoreIndex);
                          const sort_order = value.substring(lastUnderscoreIndex + 1);
                          setFilters({ ...filters, sort_by, sort_order });
                      }}
                      options={[
                        { value: 'created_at_desc', label: 'Новые сначала' },
                        { value: 'created_at_asc', label: 'Старые сначала' },
                        { value: 'total_files_desc', label: 'Больше файлов' },
                        { value: 'total_files_asc', label: 'Меньше файлов' },
                        { value: 'processing_time_desc', label: 'Дольше всего' }
                      ]}
                    />
                  </div>
                </div>

                <div style={styles.filterRow} className="workspace-filter-row workspace-filter-actions">
                  <Button type="primary" onClick={applyFilters} icon={<SearchOutlined />}>
                    Применить фильтры
                  </Button>
                  <Button onClick={resetFilters} icon={<ReloadOutlined />}>
                    Сбросить
                  </Button>
                </div>
              </div>

              {projectsLoading ? (
                <div style={styles.loading}>
                  <div style={styles.loadingSpinner}></div>
                  Загрузка проектов...
                </div>
              ) : projects.length === 0 ? (
                <div style={styles.noResults}>
                  <h3 style={{ color: 'var(--color-text-muted)', marginBottom: '10px' }}>Нет проектов по выбранным фильтрам</h3>
                  <button
                    onClick={resetFilters}
                    style={{
                      marginTop: '20px',
                      padding: '12px 20px',
                      background: 'var(--gradient-brand-soft)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '14px',
                      cursor: 'pointer',
                      fontWeight: 700
                    }}
                  >
                    Сбросить фильтры
                  </button>
                </div>
              ) : (
                <>
                  <div style={styles.projectsGrid} className="workspace-project-grid">
                    {projects.map((project) => {
                      const canDelete = isOwner(project.user_id);
                      return (
                        <div key={project.id} style={styles.projectCard}>
                          <h3 style={styles.projectName}>{project.repo_name}</h3>
                          <p style={styles.projectUrl}>{project.repo_url}</p>

                          <div style={styles.projectMeta} className="workspace-project-meta">
                            <div style={styles.projectStats}>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                <FileTextOutlined />
                                {project.analyzed_files}/{project.total_files} файлов
                              </span>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                <ClockCircleOutlined />
                                {project.processing_time.toFixed(1)}с
                              </span>
                            </div>
                            <span style={getStatusBadgeStyle(project.status)}>
                              {getStatusText(project.status)}
                            </span>
                          </div>

                          <div style={styles.projectMeta} className="workspace-project-meta">
                            <span>{formatDate(project.created_at)}</span>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                              <BranchesOutlined />
                              {project.branch}
                            </span>
                          </div>

                          <div style={styles.projectActions} className="workspace-project-actions">
                            <button
                              onClick={() => {
                                setRepoUrl(project.repo_url);
                                setBranch(project.branch);
                                setRepoPreviewError('');
                                setActiveTab('analyze');
                              }}
                              style={styles.projectButton}
                            >
                              Повторить анализ
                            </button>

                            {canDelete && (
                              <button
                                onClick={() => confirmDelete(project)}
                                style={{
                                  ...styles.deleteButton,
                                  ...(deletingId === project.id && styles.deleteButtonDisabled)
                                }}
                                disabled={deletingId === project.id}
                                title="Удалить проект"
                              >
                                {deletingId === project.id ? <div style={styles.loadingSpinner}></div> : <DeleteOutlined />}
                                {deletingId === project.id ? null : 'Удалить анализ'}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {paginatedProjects && paginatedProjects.total_pages > 1 && (
                    <div style={styles.paginationContainer}>
                      <Pagination
                        current={paginatedProjects.page}
                        pageSize={paginatedProjects.page_size}
                        total={paginatedProjects.total}
                        showSizeChanger
                        showQuickJumper
                        showTotal={(total) => `Всего ${total} проектов`}
                        onChange={handlePageChange}
                        onShowSizeChange={(current, size) => handlePageChange(1, size)}
                      />
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {activeTab === 'results' && (
            <>
              <h2 style={{ marginBottom: '20px', color: 'var(--color-brand-900)' }}>
                Результаты анализа: {extractRepoName(repoUrl)}
                {analysisResult && (
                  <span style={{ fontSize: '14px', color: 'var(--color-text-muted)', marginLeft: '10px', fontWeight: 'normal' }}>
                    ({analysisResult.length} файлов)
                  </span>
                )}
              </h2>

              {!analysisResult || analysisResult.length === 0 ? (
                <div style={styles.noResults}>
                  <h3 style={{ color: 'var(--color-text-muted)', marginBottom: '10px' }}>Нет результатов для отображения</h3>
                  <p style={{ color: 'var(--color-text-muted)' }}>
                    {loading ? 'Идет анализ...' : 'Попробуйте проанализировать репозиторий'}
                  </p>
                  <button
                    onClick={() => setActiveTab('analyze')}
                    style={{
                      marginTop: '20px',
                      padding: '12px 20px',
                      background: 'var(--gradient-brand-soft)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '14px',
                      cursor: 'pointer',
                      fontWeight: 700
                    }}
                  >
                    Начать анализ
                  </button>
                </div>
              ) : (
                <>
                  <div style={styles.statsContainer}>
                    <h3 style={{ margin: 0 }}>Статистика анализа</h3>
                    <div style={styles.statsGrid}>
                      <div style={styles.statCard}>
                        <div style={styles.statLabel}>Файлов проанализировано</div>
                        <div style={styles.statValue}>{analysisResult.length}</div>
                      </div>
                      <div style={styles.statCard}>
                        <div style={styles.statLabel}>Средняя уверенность</div>
                        <div style={styles.statValue}>
                          {((analysisResult.reduce((sum, file) => sum + file.confidence, 0) / analysisResult.length) * 100).toFixed(1)}%
                        </div>
                      </div>
                      <div style={styles.statCard}>
                        <div style={styles.statLabel}>Всего функций</div>
                        <div style={styles.statValue}>
                          {analysisResult.reduce((sum, file) => sum + (file.functions?.length || 0), 0)}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div style={styles.resultsList}>
                    {analysisResult
                      .filter(file => file && file.file_path)
                      .map((file, index) => (
                        <div key={file.id || index} style={styles.resultCard}>
                          <div style={styles.resultHeader} className="workspace-result-header">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                              <span style={styles.filePath}>
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                                  <FileTextOutlined />
                                  {file.file_path}
                                </span>
                                <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginLeft: '10px' }}>
                                  ({file.language})
                                </span>
                              </span>
                              <button onClick={() => copyToClipboard(renderDocumentationContent(file))} style={styles.copyButton}>
                                <CopyOutlined />
                                Копировать
                              </button>
                            </div>
                            <div style={styles.fileInfo}>
                              <span style={{
                                fontSize: '12px',
                                color: file.confidence > 0.7 ? 'var(--color-success)' : file.confidence > 0.4 ? 'var(--color-accent-500)' : 'var(--color-danger)',
                                fontWeight: 'bold'
                              }}>
                                Уверенность: {(file.confidence * 100).toFixed(1)}%
                              </span>
                              <span style={{ ...styles.fileStatus, ...getStatusBadgeStyle(file.status) }}>
                                {getStatusText(file.status)}
                              </span>
                            </div>
                          </div>

                          {file.error && <div style={styles.errorMessage}>Ошибка: {safeRender(file.error)}</div>}
                          {renderContentByViewMode(renderDocumentationContent(file))}
                        </div>
                      ))}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* Модальное окно управления файлами */}
      <Modal
        title={`Файлы проекта: ${selectedProject?.repo_name}`}
        open={fileModalVisible}
        onCancel={() => {
          setSelectedProject(null);
          setFileModalVisible(false);
        }}
        footer={null}
        width={600}
      >
        <Upload
          customRequest={({ file, onSuccess, onError }) => {
            handleFileUpload(file as File, selectedProject!.id)
              .then(() => onSuccess?.({}))
              .catch(onError);
          }}
          showUploadList={false}
          accept=".pdf,.txt,.md,.json,.zip,.py,.js,.ts,.html,.css"
        >
          <Button type="primary" icon={<FileAddOutlined />} loading={uploading} style={{ marginBottom: 16 }}>
            Загрузить файл
          </Button>
        </Upload>

        {projectFiles.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--color-text-muted)' }}>
            Нет загруженных файлов
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {projectFiles.map(file => (
              <div
                key={file.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px',
                  background: 'var(--color-surface-soft)',
                  borderRadius: '14px',
                  border: '1px solid var(--color-border)'
                }}
                className="workspace-file-row"
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>{file.original_name}</div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                    {(file.file_size / 1024).toFixed(2)} KB • {new Date(file.created_at).toLocaleDateString('ru-RU')}
                  </div>
                </div>
                <div className="workspace-file-actions">
                  <Button size="small" icon={<DownloadOutlined />} onClick={() => handleFileDownload(file)}>
                    Скачать
                  </Button>
                  <Button size="small" danger onClick={() => handleFileDelete(file)}>
                    Удалить
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Dashboard;
