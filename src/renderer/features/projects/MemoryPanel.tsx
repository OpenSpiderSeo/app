import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, TextArea } from '@heroui/react';
import { useI18n } from '../../i18n/I18nProvider';
import { QueryKey } from '../../lib/query-keys.const';
import { useProject } from '../projects/ProjectProvider';

export function MemoryPanel() {
  const { t } = useI18n();
  const { active } = useProject();
  const queryClient = useQueryClient();
  const [text, setText] = useState('');

  const notesQuery = useQuery({
    queryKey: [...QueryKey.ProjectMemory, active?.id],
    queryFn: () => window.openspider.listProjectMemory(active?.id),
    enabled: Boolean(active?.id),
  });

  const addMutation = useMutation({
    mutationFn: (note: string) => window.openspider.addProjectMemory(note, active?.id),
    onSuccess: async () => {
      setText('');
      await queryClient.invalidateQueries({ queryKey: QueryKey.ProjectMemory });
    },
  });

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    addMutation.mutate(trimmed);
  };

  const notes = notesQuery.data ?? [];

  return (
    <div className="os-page">
      <p className="hub-panel__lead">{t('memory.subtitle')}</p>

      <form className="os-surface memory-form" onSubmit={onSubmit}>
        <div className="memory-form__field">
          <TextArea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t('memory.placeholder')}
            rows={4}
          />
        </div>
        <div className="memory-form__actions">
          <Button type="submit" variant="primary" isDisabled={addMutation.isPending}>
            {t('memory.add')}
          </Button>
        </div>
      </form>

      {notes.length === 0 ? (
        <p className="os-empty">{t('memory.empty')}</p>
      ) : (
        <ul className="memory-list">
          {notes.map((n) => (
            <li key={n.id} className="memory-note">
              <time className="memory-note__time">
                {new Date(n.createdAt).toLocaleString()}
              </time>
              <p className="memory-note__text">{n.text}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
