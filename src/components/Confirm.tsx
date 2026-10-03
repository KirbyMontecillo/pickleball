import { Button } from './ui';

interface Props {
  title: string;
  body: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
}

export default function Confirm({ title, body, confirmLabel, onCancel, onConfirm }: Props) {
  return (
    <div className="fixed inset-0 z-30 flex items-end bg-black/20" onClick={onCancel}>
      <div className="mx-auto w-full max-w-md space-y-3 rounded-t-3xl bg-white p-6 pb-10" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
        <p className="pb-2 text-gray-400">{body}</p>
        <Button onClick={onConfirm}>{confirmLabel}</Button>
        <Button variant="soft" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
}