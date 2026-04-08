import { FormEvent, useMemo, useState } from 'react';
import { BarChart3, Lock, Plus, Vote } from 'lucide-react';
import { useCreatePoll, useGetPolls, useTogglePoll, useVotePoll, type Poll } from '@/api/queries';
import { useAuthStore } from '@/store/authStore';
import { AppRole } from '@/types/auth';

const MAX_OPTIONS = 5;

const getVoteCountForOption = (poll: Poll, optionId: string) =>
  poll.votes.filter((vote) => vote.optionId === optionId).length;

export function PollsPage() {
  const user = useAuthStore((s) => s.user);
  const { data: polls, isLoading } = useGetPolls();
  const createPoll = useCreatePoll();
  const votePoll = useVotePoll();
  const togglePoll = useTogglePoll();

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [question, setQuestion] = useState('');
  const [description, setDescription] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [formError, setFormError] = useState<string | null>(null);

  const isOfficerOrAdmin =
    user?.appRole === AppRole.ADMIN || user?.appRole === AppRole.OFFICER;

  const cleanedOptions = useMemo(
    () => options.map((option) => option.trim()).filter((option) => option.length > 0),
    [options],
  );

  const canCreate =
    !createPoll.isPending && question.trim().length >= 5 && cleanedOptions.length >= 2;

  const resetForm = () => {
    setQuestion('');
    setDescription('');
    setOptions(['', '']);
    setFormError(null);
  };

  const handleCreatePoll = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    if (question.trim().length < 5) {
      setFormError('La question doit contenir au moins 5 caracteres.');
      return;
    }

    if (cleanedOptions.length < 2) {
      setFormError('Ajoutez au moins 2 options valides.');
      return;
    }

    const uniqueOptions = new Set(cleanedOptions.map((option) => option.toLowerCase()));
    if (uniqueOptions.size !== cleanedOptions.length) {
      setFormError('Les options doivent etre uniques.');
      return;
    }

    try {
      await createPoll.mutateAsync({
        question: question.trim(),
        description: description.trim() || undefined,
        options: cleanedOptions,
      });
      resetForm();
      setShowCreateForm(false);
    } catch (error) {
      console.error('Erreur creation sondage:', error);
      setFormError('Impossible de creer le sondage pour le moment.');
    }
  };

  const handleVote = async (pollId: string, optionId: string) => {
    try {
      await votePoll.mutateAsync({ pollId, optionId });
    } catch (error) {
      console.error('Erreur vote:', error);
    }
  };

  const handleToggle = async (pollId: string) => {
    try {
      await togglePoll.mutateAsync(pollId);
    } catch (error) {
      console.error('Erreur changement etat sondage:', error);
    }
  };

  return (
    <div className="min-h-full bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900 text-slate-100">
      <div className="mx-auto max-w-5xl px-4 py-6 md:px-8 md:py-8">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Sondages de Guilde</h1>
            <p className="mt-2 text-slate-400">
              Votez pour les decisions de guilde. Les officiers peuvent creer et fermer les sondages.
            </p>
          </div>

          {isOfficerOrAdmin && (
            <button
              type="button"
              onClick={() => {
                setShowCreateForm((value) => !value);
                setFormError(null);
              }}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-amber-400/60 bg-amber-500/15 px-4 py-2.5 text-sm font-semibold text-amber-300 transition-colors hover:bg-amber-500/25 sm:w-auto"
            >
              <Plus className="h-4 w-4" />
              {showCreateForm ? 'Fermer le formulaire' : 'Nouveau sondage'}
            </button>
          )}
        </div>

        {isOfficerOrAdmin && showCreateForm && (
          <form
            onSubmit={handleCreatePoll}
            className="mb-8 rounded-xl border border-slate-800 bg-slate-900 p-4 md:p-6"
          >
            <h2 className="mb-4 text-lg font-semibold">Creer un sondage</h2>

            <div className="space-y-4">
              <div>
                <label htmlFor="poll-question" className="mb-2 block text-sm font-medium text-slate-300">
                  Question
                </label>
                <input
                  id="poll-question"
                  type="text"
                  value={question}
                  onChange={(event) => setQuestion(event.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none transition-colors focus:border-amber-500"
                  placeholder="Ex: Quel soir pour le prochain raid HM ?"
                  maxLength={250}
                  required
                />
              </div>

              <div>
                <label htmlFor="poll-description" className="mb-2 block text-sm font-medium text-slate-300">
                  Description (optionnelle)
                </label>
                <textarea
                  id="poll-description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  className="h-24 w-full resize-y rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none transition-colors focus:border-amber-500"
                  placeholder="Contexte du sondage"
                  maxLength={2000}
                />
              </div>

              <div>
                <p className="mb-2 text-sm font-medium text-slate-300">Options (2 a 5)</p>
                <div className="space-y-2">
                  {options.map((option, index) => (
                    <input
                      key={`poll-option-${index}`}
                      type="text"
                      value={option}
                      onChange={(event) => {
                        const next = [...options];
                        next[index] = event.target.value;
                        setOptions(next);
                      }}
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none transition-colors focus:border-amber-500"
                      placeholder={`Option ${index + 1}`}
                      maxLength={120}
                    />
                  ))}
                </div>

                <div className="mt-3 flex flex-wrap gap-3">
                  <button
                    type="button"
                    disabled={options.length >= MAX_OPTIONS}
                    onClick={() => setOptions((prev) => [...prev, ''])}
                    className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Ajouter une option
                  </button>

                  <button
                    type="button"
                    disabled={options.length <= 2}
                    onClick={() => setOptions((prev) => prev.slice(0, -1))}
                    className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Retirer la derniere option
                  </button>
                </div>
              </div>
            </div>

            {formError && (
              <p className="mt-4 rounded-lg border border-red-500/40 bg-red-900/20 px-3 py-2 text-sm text-red-300">
                {formError}
              </p>
            )}

            <div className="mt-6 flex w-full flex-col gap-3 md:flex-row md:items-center">
              <button
                type="submit"
                disabled={!canCreate}
                className="w-full rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-slate-950 transition-colors hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-60 md:w-auto"
              >
                {createPoll.isPending ? 'Creation...' : 'Creer le sondage'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCreateForm(false);
                  resetForm();
                }}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm font-semibold text-slate-200 transition-colors hover:bg-slate-700 md:w-auto"
              >
                Annuler
              </button>
            </div>
          </form>
        )}

        <div className="space-y-4">
          {isLoading && <p className="text-slate-400">Chargement des sondages...</p>}

          {!isLoading && (!polls || polls.length === 0) && (
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-8 text-center text-slate-400">
              Aucun sondage pour le moment.
            </div>
          )}

          {polls?.map((poll) => {
            const userVote = poll.votes.find((vote) => vote.userId === user?.userId);
            const hasVoted = Boolean(userVote);
            const totalVotes = poll.votes.length;
            const showResults = hasVoted || !poll.isActive;

            return (
              <article
                key={poll.id}
                className="rounded-xl border border-slate-800 bg-slate-900 p-4 md:p-6"
              >
                <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-100 md:text-xl">{poll.question}</h2>
                    {poll.description && (
                      <p className="mt-2 whitespace-pre-wrap text-slate-400 break-words">{poll.description}</p>
                    )}
                    <p className="mt-3 text-xs text-slate-500">
                      Cree par {poll.createdBy?.battletag || 'Inconnu'} · {new Date(poll.createdAt).toLocaleString('fr-FR')}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        poll.isActive
                          ? 'border border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
                          : 'border border-slate-600 bg-slate-800 text-slate-300'
                      }`}
                    >
                      {poll.isActive ? 'Ouvert' : 'Ferme'}
                    </span>

                    {isOfficerOrAdmin && (
                      <button
                        type="button"
                        onClick={() => handleToggle(poll.id)}
                        className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 transition-colors hover:bg-slate-700"
                      >
                        {poll.isActive ? 'Fermer' : 'Ouvrir'}
                      </button>
                    )}
                  </div>
                </div>

                {poll.isActive && (
                  <div className="space-y-3">
                    {poll.options.map((option) => {
                      const isUserChoice = userVote?.optionId === option.id;

                      return (
                        <button
                          key={option.id}
                          type="button"
                          disabled={votePoll.isPending}
                          onClick={() => handleVote(poll.id, option.id)}
                          className={`flex w-full items-center justify-between rounded-lg border px-4 py-3 text-slate-200 transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                            isUserChoice
                              ? 'border-amber-500/70 bg-amber-500/10 hover:bg-amber-500/20'
                              : 'border-slate-700 bg-slate-800 hover:bg-slate-700'
                          }`}
                        >
                          <span>{option.text}</span>
                          <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                            <Vote className="h-3.5 w-3.5" />
                            {isUserChoice
                              ? 'Votre choix'
                              : hasVoted
                                ? 'Changer mon vote'
                                : 'Voter'}
                          </span>
                        </button>
                      );
                    })}

                    {hasVoted && (
                      <p className="text-xs text-slate-400">
                        Vous pouvez changer votre vote tant que le sondage est ouvert.
                      </p>
                    )}
                  </div>
                )}

                {showResults && (
                  <div className="space-y-4">
                    {poll.options.map((option) => {
                      const optionVotes = getVoteCountForOption(poll, option.id);
                      const percent = totalVotes > 0 ? Math.round((optionVotes / totalVotes) * 100) : 0;
                      const isUserChoice = userVote?.optionId === option.id;

                      return (
                        <div
                          key={option.id}
                          className={`rounded-lg border px-4 py-3 ${
                            isUserChoice
                              ? 'border-amber-500/70 bg-amber-500/10'
                              : 'border-slate-700 bg-slate-800/60'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-slate-200">{option.text}</span>
                            <span className="text-sm font-semibold text-slate-300">{percent}%</span>
                          </div>

                          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-800">
                            <div className="h-full bg-amber-500" style={{ width: `${percent}%` }} />
                          </div>

                          <p className="mt-2 text-xs text-slate-500">{optionVotes} vote(s)</p>
                        </div>
                      );
                    })}

                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      {poll.isActive ? <BarChart3 className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                      <span>Total: {totalVotes} vote(s)</span>
                    </div>

                    {isOfficerOrAdmin && (
                      <div className="mt-6 border-t border-slate-700 pt-4">
                        <h3 className="mb-3 text-sm font-semibold text-slate-300">Détails des votes</h3>
                        <div className="space-y-3">
                          {poll.options.map((option) => {
                            const optionVoteDetails = poll.votes.filter(
                              (vote) => vote.optionId === option.id,
                            );

                            return (
                              <div key={option.id}>
                                <p className="mb-2 text-xs text-slate-400">{option.text}</p>
                                {optionVoteDetails.length > 0 ? (
                                  <ul className="space-y-1 rounded-lg bg-slate-950 p-2">
                                    {optionVoteDetails.map((vote) => (
                                      <li
                                        key={vote.id}
                                        className="flex items-center justify-between text-xs text-slate-300"
                                      >
                                        <span>{vote.user.battletag}</span>
                                        <span className="text-slate-500">{new Date(vote.updatedAt ?? vote.createdAt).toLocaleString('fr-FR', {
                                          month: '2-digit',
                                          day: '2-digit',
                                          hour: '2-digit',
                                          minute: '2-digit',
                                        })}</span>
                                      </li>
                                    ))}
                                  </ul>
                                ) : (
                                  <p className="text-xs text-slate-500 italic">Aucun vote</p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}
