// IBM Carbon icon set, wrapped to keep this app's icon API stable.
import {
  Microphone, Catalog, Activity, User, Share, QrCode,
  ChevronRight, ChevronLeft, Checkmark, Close, Locked,
  StopFilledAlt, Edit, DocumentExport, Renew, Information, Notebook, TrashCan, Add, Chat,
} from '@carbon/icons-react'

const wrap = (C) => ({ size = 20, ...p }) => <C size={size} {...p} />

export const MicIcon = wrap(Microphone)
export const LayersIcon = wrap(Catalog)
export const PulseIcon = wrap(Activity)
export const UserIcon = wrap(User)
export const ShareIcon = wrap(Share)
export const QrIcon = wrap(QrCode)
export const ChevronIcon = wrap(ChevronRight)
export const BackIcon = wrap(ChevronLeft)
export const CheckIcon = wrap(Checkmark)
export const XIcon = wrap(Close)
export const LockIcon = wrap(Locked)
export const EditIcon = wrap(Edit)
export const ExportIcon = wrap(DocumentExport)
export const RenewIcon = wrap(Renew)
export const InfoIcon = wrap(Information)
export const NotebookIcon = wrap(Notebook)
export const TrashIcon = wrap(TrashCan)
export const AddIcon = wrap(Add)
export const ChatIcon = wrap(Chat)

export const StopIcon = ({ size = 20, light = false }) => (
  <StopFilledAlt size={size} style={{ color: light ? '#F2F6FA' : 'currentColor' }} />
)
