import React from 'react';
import { ViewStyle } from 'react-native';
import {
  Home,
  Clock,
  MapPin,
  Briefcase,
  Search,
  User,
  Users,
  Building2,
  Package,
  IndianRupee,
  Calendar,
  FileText,
  Lock,
  Bell,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  ArrowRight,
  Check,
  Filter,
  Camera,
  Plus,
  UserPlus,
  LogOut,
  X,
  RotateCw,
  Pencil,
  Trash2,
  Share2,
  Download,
  Upload,
  Info,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  WifiOff,
  Settings,
  Star,
  Phone,
  Mail,
  Globe,
  List,
  Grid,
  ClipboardList,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Maximize2,
  ZoomIn,
  ZoomOut,
  Map,
  TrendingUp,
  TrendingDown,
  Delete,
  Eye,
  EyeOff,
  LucideProps,
} from 'lucide-react-native';

export type AppIconName =
  | 'home'
  | 'attendance'
  | 'visits'
  | 'sales'
  | 'inspect'
  | 'profile'
  | 'teamMap'
  | 'employees'
  | 'customers'
  | 'products'
  | 'revenue'
  | 'clock'
  | 'calendar'
  | 'document'
  | 'lock'
  | 'bell'
  | 'chevronRight'
  | 'chevronLeft'
  | 'chevronDown'
  | 'chevronUp'
  | 'arrowLeft'
  | 'arrowRight'
  | 'check'
  | 'search'
  | 'filter'
  | 'camera'
  | 'plus'
  | 'add'
  | 'addUser'
  | 'logout'
  | 'close'
  | 'refresh'
  | 'edit'
  | 'delete'
  | 'share'
  | 'download'
  | 'upload'
  | 'info'
  | 'warning'
  | 'error'
  | 'success'
  | 'sync'
  | 'wifiOff'
  | 'history'
  | 'locationPin'
  | 'building'
  | 'settings'
  | 'star'
  | 'phone'
  | 'mail'
  | 'globe'
  | 'list'
  | 'grid'
  | 'clipboard'
  | 'play'
  | 'pause'
  | 'skipForward'
  | 'skipBack'
  | 'maximize'
  | 'zoomIn'
  | 'zoomOut'
  | 'mapPin'
  | 'route'
  | 'barChart'
  | 'trendUp'
  | 'trendDown'
  | 'briefcase'
  | 'package'
  | 'backspace'
  | 'eye'
  | 'eyeOff';

const ICON_MAP: Record<string, React.ComponentType<LucideProps>> = {
  home: Home,
  attendance: Clock,
  visits: MapPin,
  sales: Briefcase,
  inspect: Search,
  profile: User,
  teamMap: Map,
  employees: Users,
  customers: Building2,
  products: Package,
  revenue: IndianRupee,
  clock: Clock,
  calendar: Calendar,
  document: FileText,
  lock: Lock,
  bell: Bell,
  chevronRight: ChevronRight,
  chevronLeft: ChevronLeft,
  chevronDown: ChevronDown,
  chevronUp: ChevronUp,
  arrowLeft: ArrowLeft,
  arrowRight: ArrowRight,
  check: Check,
  search: Search,
  filter: Filter,
  camera: Camera,
  plus: Plus,
  add: Plus,
  addUser: UserPlus,
  logout: LogOut,
  close: X,
  refresh: RotateCw,
  edit: Pencil,
  delete: Trash2,
  share: Share2,
  download: Download,
  upload: Upload,
  info: Info,
  warning: AlertTriangle,
  error: AlertCircle,
  success: CheckCircle2,
  sync: RefreshCw,
  wifiOff: WifiOff,
  history: FileText,
  locationPin: MapPin,
  building: Building2,
  settings: Settings,
  star: Star,
  phone: Phone,
  mail: Mail,
  globe: Globe,
  list: List,
  grid: Grid,
  clipboard: ClipboardList,
  play: Play,
  pause: Pause,
  skipForward: SkipForward,
  skipBack: SkipBack,
  maximize: Maximize2,
  zoomIn: ZoomIn,
  zoomOut: ZoomOut,
  mapPin: MapPin,
  route: Map,
  barChart: TrendingUp,
  trendUp: TrendingUp,
  trendDown: TrendingDown,
  briefcase: Briefcase,
  package: Package,
  backspace: Delete,
  eye: Eye,
  eyeOff: EyeOff,
};

interface AppIconProps {
  name: AppIconName | string;
  color?: string;
  size?: number;
  style?: ViewStyle;
}

export function AppIcon({ name, color = '#1E40AF', size = 20, style }: AppIconProps) {
  const IconComponent = ICON_MAP[name] ?? HelpCircleFallback;

  return (
    <IconComponent
      color={color}
      size={size}
      strokeWidth={2}
      style={style as object}
    />
  );
}

function HelpCircleFallback(props: LucideProps) {
  return <Info {...props} />;
}
