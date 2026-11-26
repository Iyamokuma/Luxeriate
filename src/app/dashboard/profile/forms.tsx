"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input, NativeSelect } from "@/components/ui/input";
import { PasswordInput } from "@/app/(auth)/auth-form";
import { STATES, lgasFor } from "@/lib/data/nigeria";
import { changePassword, updateProfile, type ProfileState } from "../actions";

type Initial = {
  full_name: string;
  phone: string;
  whatsapp: string;
  address: string;
  state: string;
  lga: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
};

export function ProfileForms({ email, initial }: { email: string; initial: Initial }) {
  const [state, action, pending] = useActionState<ProfileState, FormData>(updateProfile, undefined);
  const [pw, pwAction, pwPending] = useActionState<ProfileState, FormData>(changePassword, undefined);
  const [st, setSt] = useState(initial.state);
  const fe = state?.fieldErrors ?? {};
  const pe = pw?.fieldErrors ?? {};

  useEffect(() => {
    if (state?.ok) toast.success("Your details have been saved.");
    if (state?.error) toast.error(state.error);
  }, [state]);
  useEffect(() => {
    if (pw?.ok) toast.success("Your password has been changed.");
    if (pw?.error) toast.error(pw.error);
  }, [pw]);

  return (
    <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
      <Card>
        <form action={action}>
          <CardHeader>
            <CardTitle>Your details</CardTitle>
            <p className="text-sm text-ink-500">Signed in as {email}</p>
          </CardHeader>
          <CardContent className="grid gap-5 sm:grid-cols-2">
            <Field label="Full name" htmlFor="full_name" error={fe.full_name} className="sm:col-span-2">
              <Input id="full_name" name="full_name" defaultValue={initial.full_name} aria-invalid={!!fe.full_name} />
            </Field>
            <Field label="Phone number" htmlFor="phone" error={fe.phone}>
              <Input id="phone" name="phone" type="tel" defaultValue={initial.phone} aria-invalid={!!fe.phone} />
            </Field>
            <Field label="WhatsApp number" htmlFor="whatsapp" error={fe.whatsapp}>
              <Input id="whatsapp" name="whatsapp" type="tel" defaultValue={initial.whatsapp} aria-invalid={!!fe.whatsapp} />
            </Field>
            <Field label="Home address" htmlFor="address" error={fe.address} className="sm:col-span-2">
              <Input id="address" name="address" defaultValue={initial.address} aria-invalid={!!fe.address} />
            </Field>
            <Field label="State" htmlFor="state" error={fe.state}>
              <NativeSelect id="state" name="state" value={st} onChange={(e) => setSt(e.target.value)}>
                <option value="">Select state</option>
                {STATES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="LGA" htmlFor="lga" error={fe.lga}>
              <NativeSelect key={st} id="lga" name="lga" defaultValue={st === initial.state ? initial.lga : ""}>
                <option value="">Select LGA</option>
                {lgasFor(st).map((l) => (
                  <option key={l}>{l}</option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Emergency contact name" htmlFor="emergency_contact_name" error={fe.emergency_contact_name}>
              <Input id="emergency_contact_name" name="emergency_contact_name" defaultValue={initial.emergency_contact_name} />
            </Field>
            <Field label="Emergency contact phone" htmlFor="emergency_contact_phone" error={fe.emergency_contact_phone}>
              <Input id="emergency_contact_phone" name="emergency_contact_phone" type="tel" defaultValue={initial.emergency_contact_phone} />
            </Field>
          </CardContent>
          <CardFooter className="justify-end">
            <Button type="submit" loading={pending}>
              Save changes
            </Button>
          </CardFooter>
        </form>
      </Card>

      <Card className="self-start">
        <form action={pwAction}>
          <CardHeader>
            <CardTitle>Change password</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field label="Current password" htmlFor="current" error={pe.current}>
              <PasswordInput id="current" name="current" autoComplete="current-password" />
            </Field>
            <Field label="New password" htmlFor="password" error={pe.password}>
              <PasswordInput id="password" name="password" autoComplete="new-password" />
            </Field>
            <Field label="Confirm new password" htmlFor="confirm" error={pe.confirm}>
              <PasswordInput id="confirm" name="confirm" autoComplete="new-password" />
            </Field>
          </CardContent>
          <CardFooter className="justify-end">
            <Button type="submit" variant="secondary" loading={pwPending}>
              Update password
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
