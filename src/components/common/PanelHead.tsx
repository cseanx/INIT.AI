import type { ReactNode } from 'react';

interface PanelHeadProps {
    title: string;
    actions?: ReactNode;
}

/** Consistent card header: title on the left, optional actions on the right. */
export default function PanelHead({ title, actions }: PanelHeadProps) {
    return (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-lg font-semibold">{title}</h3>
            {actions}
        </div>
    );
}
