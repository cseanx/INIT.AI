export interface ToastMessage {
    id: number;
    text: string;
    tone: 'success' | 'error';
}

/** Fixed bottom-right feedback toast (Save / error feedback). */
export default function Toast({ message }: { message: ToastMessage | null }) {
    if (!message) return null;
    return (
        <div
            role="status"
            className={`fixed bottom-[24px] right-[24px] z-[999] flex items-center gap-[10px] rounded-[14px] border px-[16px] py-[12px] text-[13px] font-medium shadow-[0_16px_40px_rgba(0,0,0,.5)] backdrop-blur-2xl ${
                message.tone === 'success'
                    ? 'border-[rgba(0,255,132,.25)] bg-[rgba(10,20,14,.92)] text-mint'
                    : 'border-[rgba(255,45,85,.3)] bg-[rgba(24,8,12,.92)] text-[#ff5577]'
            }`}
        >
            <i
                className={`fa-solid ${message.tone === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation'}`}
            ></i>
            {message.text}
        </div>
    );
}