/**
 * K-ALBA UI 컴포넌트 인덱스 (BI v2)
 *
 * Step 3-A (브랜드/기본 6개) + Step 3-B (폼 4개) + Step 3-C (UX 5개) = 총 15개
 *
 * @example
 *   import {
 *     // Brand
 *     KWordmark, KIcon,
 *     // Basic
 *     Button, Badge, VisaBadge, Card, CardTitle,
 *     // Form
 *     Input, Select, Form, FormField, FormSection, validators,
 *     // Loading
 *     PageLoading, Spinner, Skeleton, ButtonLoading,
 *     // UX
 *     Modal, ToastProvider, useToast, Empty, Avatar, ChatBubble,
 *   } from '@/components/ui';
 */

// ────────── Brand ──────────
export { default as KWordmark } from "./KWordmark";
export { default as KIcon } from "./KIcon";

// ────────── Basic ──────────
export { default as Button } from "./Button";
export { default as Badge } from "./Badge";
export { default as VisaBadge } from "./VisaBadge";

export {
  default as Card,
  CardTitle,
  CardSubtitle,
  CardDivider,
  CardFooter,
} from "./Card";

// ────────── Form (Step 3-B) ──────────
export { default as Input } from "./Input";
export { default as Select } from "./Select";

export {
  Form,
  FormSection,
  FormField,
  FormActions,
  FormGroup,
  FormError,
  validators,
} from "./Form";

// ────────── Loading (Step 3-B) ──────────
export {
  default as PageLoading,
  Spinner,
  InlineLoading,
  ButtonLoading,
  Skeleton,
  SkeletonCard,
} from "./Loading";

// ────────── UX (Step 3-C) ──────────
export { default as Modal } from "./Modal";
export { ToastProvider, useToast } from "./Toast";
export { default as Empty } from "./Empty";

export {
  default as Avatar,
  AvatarGroup,
} from "./Avatar";

export {
  default as ChatBubble,
  QuickReplies,
  ChatCard,
  ChatTypingIndicator,
  ChatContainer,
} from "./ChatBubble";
