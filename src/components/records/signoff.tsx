"use client";

import { useState } from "react";
import { CircleCheck, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { TextAreaField } from "@/components/ui/fields";
import { ModalBody, ModalFooter, ModalHeader } from "@/components/ui/overlay";

/** Small confirmation from frames 10.10 / 10.13 "Sign off". */
export function SignOffDialog({ open, onClose, onConfirm, title, children }: { open: boolean; onClose: () => void; onConfirm: () => void; title: string; children: React.ReactNode }) {
  return (
    <Dialog open={open} onClose={onClose} labelledBy="signoff-title" width={480}>
      <div className="flex gap-4 px-6 pt-6 pb-2">
        <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-primary-subtle text-brand">
          <CircleCheck size={20} aria-hidden />
        </span>
        <div>
          <h2 id="signoff-title" className="text-xl leading-7 font-semibold text-fg">
            {title}
          </h2>
          <p className="mt-2 text-sm leading-[22px] text-muted">{children}</p>
        </div>
      </div>
      <div className="flex justify-end gap-3 px-6 pt-4 pb-6">
        <Button variant="secondary" onClick={onClose}>
          Not yet
        </Button>
        <Button
          onClick={() => {
            onConfirm();
            onClose();
          }}
        >
          Sign off
        </Button>
      </div>
    </Dialog>
  );
}

/** "Return to Dara Sok" with a required reason (10.10 / 10.13). */
export function ReturnDialog({ open, onClose, onConfirm, person, what }: { open: boolean; onClose: () => void; onConfirm: (reason: string) => void; person: string; what: string }) {
  return (
    <Dialog open={open} onClose={onClose} labelledBy="return-title" width={540}>
      {open && <ReturnForm onClose={onClose} onConfirm={onConfirm} person={person} what={what} />}
    </Dialog>
  );
}

function ReturnForm({ onClose, onConfirm, person, what }: { onClose: () => void; onConfirm: (reason: string) => void; person: string; what: string }) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string>();
  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        if (reason.trim().length < 5) return setError("Say what needs to change so they can fix it.");
        onConfirm(reason.trim());
        onClose();
      }}
    >
      <ModalHeader
        id="return-title"
        title={`Return to ${person}`}
        description={`${person.split(" ")[0]} will be notified in the app and on Telegram, and can correct and resubmit the ${what}.`}
        icon={<Undo2 size={20} aria-hidden />}
        iconTone="warning"
        onClose={onClose}
      />
      <ModalBody>
        <TextAreaField label="What needs to change?" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} state={error ? "error" : "default"} message={error ?? "Required. Shown at the top of the returned record."} />
      </ModalBody>
      <ModalFooter>
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" icon={Undo2}>
          Return for changes
        </Button>
      </ModalFooter>
    </form>
  );
}
