import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import Modal from './Modal';

describe('Accessible modal keyboard workflow', () => {
  it('names the dialog, keeps keyboard focus inside it, and restores the opener', () => {
    const opener = document.createElement('button');
    document.body.append(opener);
    opener.focus();
    const view = render(<Modal open title="Model scan" onClose={() => {}} footer={<button>Start scan</button>}><input aria-label="Model name" /></Modal>);
    expect(screen.getByRole('dialog', { name: 'Model scan' })).toBeInTheDocument();
    const close = screen.getByRole('button', { name: 'Close' });
    const start = screen.getByRole('button', { name: 'Start scan' });
    expect(close).toHaveFocus();
    fireEvent.keyDown(close, { key: 'Tab', shiftKey: true });
    expect(start).toHaveFocus();
    fireEvent.keyDown(start, { key: 'Tab' });
    expect(close).toHaveFocus();
    view.unmount();
    expect(opener).toHaveFocus();
    opener.remove();
  });
  it('closes only the topmost modal with Escape', () => {
    const outerClose = vi.fn();
    const innerClose = vi.fn();
    render(<><Modal open title="Settings" onClose={outerClose}>Preferences</Modal><Modal open title="Reset" onClose={innerClose}>Confirm reset</Modal></>);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(innerClose).toHaveBeenCalledOnce();
    expect(outerClose).not.toHaveBeenCalled();
  });
});
