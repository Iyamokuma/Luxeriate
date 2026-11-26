declare module "@paystack/inline-js" {
  type Callbacks = {
    onSuccess?: (tx: { reference: string; status: string; trans?: string; transaction?: string; message?: string }) => void;
    onCancel?: () => void;
    onLoad?: (res: unknown) => void;
    onError?: (err: { message?: string }) => void;
  };
  export default class PaystackPop {
    resumeTransaction(accessCode: string, callbacks?: Callbacks): unknown;
  }
}
