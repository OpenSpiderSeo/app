import { memo, type ReactElement } from 'react';

export interface PanelTabItem<T extends string> {
  id: T;
  label: string;
}

interface PanelTabsProps<T extends string> {
  ariaLabel: string;
  tabs: readonly PanelTabItem<T>[];
  active: T;
  onChange: (id: T) => void;
  className?: string;
}

function PanelTabsInner<T extends string>({
  ariaLabel,
  tabs,
  active,
  onChange,
  className = '',
}: PanelTabsProps<T>): ReactElement {
  return (
    <div
      className={`hub-shell__tabs panel-tabs ${className}`.trim()}
      role="tablist"
      aria-label={ariaLabel}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === active;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={`panel-tab-${tab.id}`}
            aria-selected={isActive}
            aria-controls={`panel-pane-${tab.id}`}
            data-testid={`panel-tab-${tab.id}`}
            className={`hub-shell__tab${isActive ? ' hub-shell__tab--active' : ''}`}
            onClick={() => onChange(tab.id)}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

/** Inner panel tabs — reuses hub-shell pill styles (one active pane). */
export const PanelTabs = memo(PanelTabsInner) as typeof PanelTabsInner;
