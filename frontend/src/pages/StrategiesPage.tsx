import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import {
  useGetStrategies,
  useCreateStrategy,
  useUpdateStrategy,
  useDeleteStrategy,
  type Strategy,
  type CreateStrategyPayload,
} from '@/api/queries';
import { AppRole } from '@/types/auth';
import { Edit2, Trash2, Swords, Shield, Heart, Crosshair } from 'lucide-react';

const emptyForm: CreateStrategyPayload = {
  bossName: '',
  raidName: '',
  positioningImageUrl: '',
  generalMechanics: '',
  tankNotes: '',
  healerNotes: '',
  dpsNotes: '',
};

const resolveStrategyImageUrl = (url: string | null) => {
  if (!url) return null;

  // Absolute URL from API/editor input: use as-is.
  if (/^https?:\/\//i.test(url)) return url;

  // Already routed through the API proxy.
  if (url.startsWith('/api/')) return url;

  // Backend returns "/uploads/..."; proxy it through Vite /api -> backend.
  if (url.startsWith('/')) return `/api${url}`;

  return `/api/${url}`;
};

export function StrategiesPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const { data: strategies } = useGetStrategies();
  const createMutation = useCreateStrategy();
  const updateMutation = useUpdateStrategy();
  const deleteMutation = useDeleteStrategy();

  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState<CreateStrategyPayload>(emptyForm);
  const [imageFile, setImageFile] = useState<File | null>(null);

  const isCreating = id === 'new';
  const isOfficerOrAdmin =
    user?.appRole === AppRole.ADMIN || user?.appRole === AppRole.OFFICER;

  const selectedStrategy = strategies?.find((s) => s.id === id) ?? null;

  // Reset edit mode on navigation
  useEffect(() => {
    setIsEditing(false);
    setImageFile(null);
  }, [id]);

  const startEdit = () => {
    if (!selectedStrategy) return;
    setForm({
      bossName: selectedStrategy.bossName,
      raidName: selectedStrategy.raidName,
      positioningImageUrl: selectedStrategy.positioningImageUrl ?? '',
      generalMechanics: selectedStrategy.generalMechanics,
      tankNotes: selectedStrategy.tankNotes ?? '',
      healerNotes: selectedStrategy.healerNotes ?? '',
      dpsNotes: selectedStrategy.dpsNotes ?? '',
    });
    setImageFile(null);
    setIsEditing(true);
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setImageFile(null);
    if (isCreating) navigate('/strategies');
  };

  const handleSave = async () => {
    if (isCreating) {
      const created = await createMutation.mutateAsync({
        ...form,
        imageFile: imageFile || undefined,
      });
      navigate(`/strategies/${created.id}`);
    } else if (isEditing && id) {
      await updateMutation.mutateAsync({
        id,
        ...form,
        imageFile: imageFile || undefined,
      });
      setIsEditing(false);
      setImageFile(null);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    if (!confirm('Supprimer cette stratégie ?')) return;
    await deleteMutation.mutateAsync(id);
    navigate('/strategies');
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  const inputClass =
    'w-full bg-slate-900 border border-slate-700 rounded-md p-3 text-slate-200 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-colors';

  // /strategies (no id) → placeholder
  if (!id) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-500 p-6">
        <Swords className="w-16 h-16 mb-4 opacity-30" />
        <p className="text-lg">Sélectionnez un boss dans le menu</p>
      </div>
    );
  }

  // /strategies/new → create form
  if (isCreating) {
    return (
      <div className="p-6">
        <StrategyForm
          form={form}
          setForm={setForm}
          imageFile={imageFile}
          setImageFile={setImageFile}
          onSave={handleSave}
          onCancel={cancelEdit}
          isSaving={isSaving}
          inputClass={inputClass}
          title="Nouvelle Stratégie"
        />
      </div>
    );
  }

  // /strategies/:id but not found
  if (!selectedStrategy) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-500 p-6">
        <Swords className="w-16 h-16 mb-4 opacity-30" />
        <p className="text-lg">Stratégie introuvable</p>
      </div>
    );
  }

  // /strategies/:id → view or edit
  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-sm text-amber-500 font-medium">{selectedStrategy.raidName}</p>
          <h1 className="text-2xl font-bold text-slate-100">{selectedStrategy.bossName}</h1>
        </div>
        {isOfficerOrAdmin && !isEditing && (
          <div className="flex items-center gap-2">
            <button
              onClick={startEdit}
              className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-md text-sm font-medium transition-colors"
            >
              <Edit2 className="w-4 h-4" />
              Éditer
            </button>
            <button
              onClick={handleDelete}
              className="flex items-center gap-2 px-4 py-2 bg-red-900/50 hover:bg-red-800/60 text-red-400 rounded-md text-sm font-medium transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Supprimer
            </button>
          </div>
        )}
      </div>

      {isEditing ? (
        <StrategyForm
          form={form}
          setForm={setForm}
          imageFile={imageFile}
          setImageFile={setImageFile}
          onSave={handleSave}
          onCancel={cancelEdit}
          isSaving={isSaving}
          inputClass={inputClass}
          title="Modifier la Stratégie"
        />
      ) : (
        <StrategyView strategy={selectedStrategy} />
      )}
    </div>
  );
}

// ==================== Read-only view ====================

function StrategyView({ strategy }: { strategy: Strategy }) {
  const imageUrl = resolveStrategyImageUrl(strategy.positioningImageUrl);

  return (
    <div className="space-y-6">
      {/* Positioning image */}
      {imageUrl && (
        <div className="flex justify-center">
          <img
            src={imageUrl}
            alt={`Positionnement - ${strategy.bossName}`}
            className="max-h-96 object-contain rounded-lg border border-slate-700"
          />
        </div>
      )}

      {/* General mechanics */}
      <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
        <h3 className="text-sm font-semibold text-amber-500 uppercase tracking-wider mb-3 flex items-center gap-2">
          <Swords className="w-4 h-4" />
          Mécanique Générale
        </h3>
        <p className="text-slate-300 whitespace-pre-wrap leading-relaxed">
          {strategy.generalMechanics}
        </p>
      </div>

      {/* Role notes grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Tanks */}
        <div className="border-l-4 border-blue-500 bg-blue-950/20 p-4 rounded-r-lg">
          <h3 className="text-sm font-semibold text-blue-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Tanks
          </h3>
          <p className="text-slate-300 whitespace-pre-wrap text-sm leading-relaxed">
            {strategy.tankNotes || 'Aucune note spécifique.'}
          </p>
        </div>

        {/* Healers */}
        <div className="border-l-4 border-green-500 bg-green-950/20 p-4 rounded-r-lg">
          <h3 className="text-sm font-semibold text-green-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Heart className="w-4 h-4" />
            Heals
          </h3>
          <p className="text-slate-300 whitespace-pre-wrap text-sm leading-relaxed">
            {strategy.healerNotes || 'Aucune note spécifique.'}
          </p>
        </div>

        {/* DPS */}
        <div className="border-l-4 border-red-500 bg-red-950/20 p-4 rounded-r-lg">
          <h3 className="text-sm font-semibold text-red-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Crosshair className="w-4 h-4" />
            DPS
          </h3>
          <p className="text-slate-300 whitespace-pre-wrap text-sm leading-relaxed">
            {strategy.dpsNotes || 'Aucune note spécifique.'}
          </p>
        </div>
      </div>

      {/* Meta */}
      <p className="text-xs text-slate-600 text-right">
        Créée par {strategy.createdBy.battletag} &middot;{' '}
        {new Date(strategy.updatedAt).toLocaleDateString('fr-FR')}
      </p>
    </div>
  );
}

// ==================== Form (create / edit) ====================

function StrategyForm({
  form,
  setForm,
  onSave,
  onCancel,
  isSaving,
  inputClass,
  title,
  imageFile,
  setImageFile,
}: {
  form: CreateStrategyPayload;
  setForm: React.Dispatch<React.SetStateAction<CreateStrategyPayload>>;
  onSave: () => void;
  onCancel: () => void;
  isSaving: boolean;
  inputClass: string;
  title: string;
  imageFile: File | null;
  setImageFile: React.Dispatch<React.SetStateAction<File | null>>;
}) {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setImageFile(selectedFile);
      // Vider l'input URL si un fichier est sélectionné
      setForm((f) => ({ ...f, positioningImageUrl: '' }));
    }
  };

  const handleUrlChange = (url: string) => {
    setForm((f) => ({ ...f, positioningImageUrl: url }));
    // Vider le fichier si on tape une URL
    if (url.trim()) {
      setImageFile(null);
      const fileInput = document.getElementById('file-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <h2 className="text-xl font-bold text-slate-100">{title}</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-400 mb-1">Nom du Raid</label>
          <input
            type="text"
            required
            value={form.raidName}
            onChange={(e) => setForm((f) => ({ ...f, raidName: e.target.value }))}
            className={inputClass}
            placeholder="Ex: Nerub-ar Palace"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-400 mb-1">Nom du Boss</label>
          <input
            type="text"
            required
            value={form.bossName}
            onChange={(e) => setForm((f) => ({ ...f, bossName: e.target.value }))}
            className={inputClass}
            placeholder="Ex: Queen Ansurek"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-400 mb-1">
          Image de positionnement (URL)
        </label>
        <input
          type="text"
          value={form.positioningImageUrl ?? ''}
          onChange={(e) => handleUrlChange(e.target.value)}
          className={inputClass}
          placeholder="https://..."
          disabled={!!imageFile}
        />
        {imageFile && (
          <p className="text-xs text-amber-500 mt-1">Un fichier local est sélectionné</p>
        )}
      </div>

      <div className="mt-4 p-4 border border-dashed border-slate-700 rounded-lg bg-slate-900/50 flex flex-col items-center gap-3">
        <label htmlFor="file-upload" className="text-sm text-slate-400">
          Ou uploadez un fichier local
        </label>
        <input
          type="file"
          id="file-upload"
          accept="image/*"
          onChange={handleFileChange}
          className="block w-full text-sm text-slate-400
            file:mr-4 file:py-2 file:px-4
            file:rounded-md file:border-0
            file:text-sm file:font-semibold
            file:bg-amber-600/10 file:text-amber-500
            hover:file:bg-amber-600/20 cursor-pointer"
        />
        {imageFile && (
          <span className="text-xs text-green-500">✓ {imageFile.name}</span>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-400 mb-1">
          Mécanique Générale *
        </label>
        <textarea
          required
          rows={5}
          value={form.generalMechanics}
          onChange={(e) => setForm((f) => ({ ...f, generalMechanics: e.target.value }))}
          className={inputClass}
          placeholder="Décris les mécaniques principales du boss..."
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-blue-400 mb-1">Notes Tank</label>
          <textarea
            rows={4}
            value={form.tankNotes ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, tankNotes: e.target.value }))}
            className={inputClass}
            placeholder="Swap taunt à X stacks..."
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-green-400 mb-1">Notes Healer</label>
          <textarea
            rows={4}
            value={form.healerNotes ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, healerNotes: e.target.value }))}
            className={inputClass}
            placeholder="CD de raid à P2..."
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-red-400 mb-1">Notes DPS</label>
          <textarea
            rows={4}
            value={form.dpsNotes ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, dpsNotes: e.target.value }))}
            className={inputClass}
            placeholder="Prio add, puis boss..."
          />
        </div>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={isSaving}
          className="px-6 py-2.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-medium rounded-md transition-colors"
        >
          {isSaving ? 'Sauvegarde...' : 'Sauvegarder'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-200 font-medium rounded-md transition-colors"
        >
          Annuler
        </button>
      </div>
    </form>
  );
}
