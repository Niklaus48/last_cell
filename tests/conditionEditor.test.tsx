// @vitest-environment jsdom
/**
 * The condition and effect editors in the studio.
 *
 * These are the controls an author actually touches, so the tests drive them the
 * way a person would: open the details row, change a select, read the verdict of
 * the tester underneath.
 */
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ConditionEditor } from '../src/studio/ConditionEditor';
import { EffectEditor } from '../src/studio/EffectEditor';
import { VariablesPanel } from '../src/studio/VariablesPanel';
import { createDraft } from '../src/studio/model';
import { chapter1Story } from '../src/story/content/chapter1';

const variables = ['composure', 'guardSuspicion'];
const labels = { composure: { label: 'خون‌سردی' }, guardSuspicion: { label: 'شک نگهبان‌ها' } };

afterEach(() => {
  cleanup();
});

function renderCondition(condition: Parameters<typeof ConditionEditor>[0]['condition'], onChange = vi.fn()) {
  render(
    <ConditionEditor
      condition={condition}
      variables={variables}
      variableLabels={labels}
      clues={chapter1Story.clues ?? []}
      scenes={chapter1Story.scenes.map((scene) => ({ id: scene.id, title: scene.title }))}
      onChange={onChange}
      testValues={{ composure: 2, guardSuspicion: 3 }}
      testDefaults={{}}
      onTestValuesChange={() => undefined}
    />,
  );
  return onChange;
}

describe('ConditionEditor', () => {
  it('offers to add a condition when a choice has none', () => {
    const onChange = renderCondition(undefined);
    expect(screen.getByText('این گزینه همیشه باز است (بدون شرط).')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /افزودن شرط/ }));
    expect(onChange).toHaveBeenCalledWith({
      kind: 'compareVariable',
      variable: 'composure',
      operator: 'gte',
      value: 1,
    });
  });

  it('shows the variable, operator and value of an existing rule', () => {
    renderCondition({ kind: 'compareVariable', variable: 'guardSuspicion', operator: 'lte', value: 1 });
    expect(screen.getByLabelText<HTMLSelectElement>('متغیر').value).toBe('guardSuspicion');
    expect(screen.getByLabelText<HTMLSelectElement>('عملگر').value).toBe('lte');
    expect(screen.getByLabelText<HTMLInputElement>('مقدار').value).toBe('1');
  });

  it('tells the author whether the rule opens or stays shut, using real values', () => {
    renderCondition({ kind: 'compareVariable', variable: 'guardSuspicion', operator: 'lte', value: 1 });
    const verdict = document.querySelector('.condition-verdict');
    expect(verdict?.textContent).toContain('بسته می‌ماند');
    expect(verdict?.textContent).toContain('شک نگهبان‌ها');
    expect(verdict?.textContent).toContain('۳');
  });

  it('updates the verdict when the tester values change', () => {
    function Harness(): React.ReactElement {
      const [values, setValues] = useState<Record<string, number>>({ guardSuspicion: 3 });
      return (
        <ConditionEditor
          condition={{ kind: 'compareVariable', variable: 'guardSuspicion', operator: 'lte', value: 1 }}
          variables={['guardSuspicion']}
          variableLabels={labels}
          clues={[]}
          scenes={[]}
          onChange={() => undefined}
          testValues={values}
          testDefaults={{}}
          onTestValuesChange={setValues}
        />
      );
    }
    render(<Harness />);
    expect(document.querySelector('.condition-verdict')?.textContent).toContain('بسته می‌ماند');
    const input = screen.getByDisplayValue('3');
    fireEvent.change(input, { target: { value: '1' } });
    expect(document.querySelector('.condition-verdict')?.textContent).toContain('باز می‌شود');
  });

  it('switches a rule to a clue requirement', () => {
    const onChange = renderCondition({ kind: 'compareVariable', variable: 'composure', operator: 'gte', value: 1 });
    fireEvent.change(screen.getByLabelText('نوع شرط'), { target: { value: 'clueDiscovered' } });
    expect(onChange).toHaveBeenCalledWith({ kind: 'clueDiscovered', clueId: 'clue' });
  });

  it('wraps a rule in an "all" group and can add siblings to it', () => {
    const onChange = renderCondition({ kind: 'compareVariable', variable: 'composure', operator: 'gte', value: 1 });
    fireEvent.change(screen.getByLabelText('نوع شرط'), { target: { value: 'all' } });
    expect(onChange).toHaveBeenCalledWith({
      kind: 'all',
      conditions: [{ kind: 'compareVariable', variable: 'composure', operator: 'gte', value: 1 }],
    });

    cleanup();
    const grouped = renderCondition({
      kind: 'all',
      conditions: [{ kind: 'compareVariable', variable: 'composure', operator: 'gte', value: 1 }],
    });
    fireEvent.click(screen.getByRole('button', { name: /شرط تازه در این گروه/ }));
    expect(grouped).toHaveBeenCalled();
    const argument = grouped.mock.calls[0]?.[0] as { kind: string; conditions: unknown[] };
    expect(argument.kind).toBe('all');
    expect(argument.conditions).toHaveLength(2);
  });

  it('removes the rule entirely', () => {
    const onChange = renderCondition({ kind: 'compareVariable', variable: 'composure', operator: 'gte', value: 1 });
    fireEvent.click(screen.getByRole('button', { name: 'حذف شرط' }));
    expect(onChange).toHaveBeenCalledWith(null);
  });
});

describe('EffectEditor', () => {
  const handlers = {
    onAdd: vi.fn(),
    onUpdate: vi.fn(),
    onRemove: vi.fn(),
    onMove: vi.fn(),
  };

  it('says so when a choice changes nothing', () => {
    render(
      <EffectEditor effects={[]} variables={variables} variableLabels={labels} clues={[]} {...handlers} />,
    );
    expect(screen.getByText('این گزینه چیزی را تغییر نمی‌دهد.')).toBeTruthy();
  });

  it('shows the effect list in application order and adds an increment', () => {
    render(
      <EffectEditor
        effects={[
          { kind: 'incrementVariable', variable: 'composure', amount: 1 },
          { kind: 'incrementVariable', variable: 'guardSuspicion', amount: 2 },
        ]}
        variables={variables}
        variableLabels={labels}
        clues={[]}
        {...handlers}
      />,
    );
    expect(screen.getByLabelText<HTMLSelectElement>('متغیر اثر 1').value).toBe('composure');
    expect(screen.getByLabelText<HTMLInputElement>('مقدار اثر 2').value).toBe('2');
    fireEvent.click(screen.getByRole('button', { name: /افزودن به متغیر/ }));
    expect(handlers.onAdd).toHaveBeenCalledWith({
      kind: 'incrementVariable',
      variable: 'composure',
      amount: 1,
    });
  });
});

describe('VariablesPanel', () => {
  const draft = createDraft();
  const noop = {
    onChangeLabel: vi.fn(),
    onChangeInitial: vi.fn(),
    onAdd: vi.fn(),
    onRemove: vi.fn(),
  };

  it('lists every declared variable with its label and starting value', () => {
    render(<VariablesPanel draft={draft} {...noop} />);
    expect(screen.getByLabelText<HTMLInputElement>('نام فارسی composure').value).toBe('خون‌سردی');
    expect(screen.getByLabelText<HTMLInputElement>('مقدار اولیهٔ planIntegrity').value).toBe('3');
  });

  it('counts how many places use a variable and refuses to delete a used one', () => {
    render(<VariablesPanel draft={draft} {...noop} />);
    const guardRow = screen.getByLabelText('نام فارسی guardSuspicion').closest('.variable-row');
    expect(guardRow?.textContent).toContain('ارجاع');
    const removeButton = guardRow?.querySelector('button');
    expect(removeButton).toHaveProperty('disabled', true);
  });

  it('adds a new variable through the name field', () => {
    render(<VariablesPanel draft={draft} {...noop} />);
    fireEvent.change(screen.getByLabelText('نام متغیر تازه'), { target: { value: 'freshMetric' } });
    fireEvent.click(screen.getByRole('button', { name: /متغیر تازه/ }));
    expect(noop.onAdd).toHaveBeenCalledWith('freshMetric');
  });
});
