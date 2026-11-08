import { useState, useMemo, useEffect } from 'react';
import {
  Search,
  SlidersHorizontal,
  Plus,
  Star,
  Trash2,
  FolderInput,
  Maximize2,
  Download,
  Upload,
  Ticket,
  CreditCard,
  Wifi,
  Globe,
  User,
  Folder as FolderIcon,
  QrCode,
  LayoutGrid,
  List as ListIcon,
  X,
} from 'lucide-react';
import { Folder, StoredQrItem, filterAndSortQrItems } from '../utils/qrLogic';
import { generateQrDataUrl } from '../utils/qrRenderer';
import { playTapSound, triggerHaptic } from '../utils/audio';
import { Language, TRANSLATIONS, getLocalizedFolderName } from '../utils/i18n';

interface GalleryViewProps {
  items: StoredQrItem[];
  folders: Folder[];
  lang?: Language;
  onSelectItem: (item: StoredQrItem) => void;
  onOpenTurnstile: (item: StoredQrItem) => void;
  onToggleFavorite: (id: string) => void;
  onDeleteItem: (id: string) => void;
  onMoveItem: (id: string, targetFolderId: string) => void;
  onOpenCreateFolder: () => void;
  onExportBackup: () => void;
  onImportBackup: (items: StoredQrItem[]) => void;
  onNavigateToScan: () => void;
  onNavigateToCreate: () => void;
}

export function GalleryView({
  items,
  folders,
  lang = 'ru',
  onSelectItem,
  onOpenTurnstile,
  onToggleFavorite,
  onDeleteItem,
  onMoveItem,
  onOpenCreateFolder,
  onExportBackup,
  onImportBackup,
  onNavigateToScan,
  onNavigateToCreate,
}: GalleryViewProps) {
  const t = TRANSLATIONS[lang];
  const [selectedFolderId, setSelectedFolderId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'alphabetical' | 'favoritesFirst'>('newest');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [movingItemId, setMovingItemId] = useState<string | null>(null);

  // Cached thumbnails for items
  const [thumbnails, setThumbnails] = useState<Record<string, string>>({});

  useEffect(() => {
    items.forEach((item) => {
      if (!thumbnails[item.id]) {
        generateQrDataUrl(item.rawContent, {
          fgColor: item.style?.fgColor || '#000000',
          bgColor: item.style?.bgColor || '#ffffff',
          ecc: 'M',
          margin: 1,
          width: 140,
        }).then((url) => {
          setThumbnails((prev) => ({ ...prev, [item.id]: url }));
        }).catch(() => {});
      }
    });
  }, [items]);

  const folderCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: items.length,
      favorites: items.filter((i) => i.isFavorite).length,
    };
    folders.forEach((f) => {
      counts[f.id] = items.filter((i) => i.folderId === f.id).length;
    });
    return counts;
  }, [items, folders]);

  const displayedItems = useMemo(() => {
    return filterAndSortQrItems(items, selectedFolderId, searchQuery, sortBy);
  }, [items, selectedFolderId, searchQuery, sortBy]);

  const getSourceBadge = (source: StoredQrItem['source']) => {
    switch (source) {
      case 'screen': return t.sourceScreen;
      case 'camera': return t.sourceCamera;
      case 'file': return t.sourceFile;
      case 'generated': return t.sourceGenerated;
      default: return 'QR';
    }
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const parsed = JSON.parse(evt.target?.result as string);
        if (Array.isArray(parsed)) {
          onImportBackup(parsed);
        }
      } catch (err) {
        alert('File error: ' + err);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="flex flex-col h-full w-full max-w-4xl mx-auto px-4 py-2 space-y-4">
      {/* Material You 3 Search Bar & Controls */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#8e918f] absolute left-4 top-3.5 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.searchPlaceholder}
            className="w-full pl-11 pr-10 py-2.5 rounded-full bg-[#282a2f] text-xs sm:text-sm text-[#e3e2e6] placeholder:text-[#8e918f] focus:outline-none focus:ring-2 focus:ring-[#a8f09b] border-none shadow-sm transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="w-6 h-6 rounded-full bg-white/[0.08] text-[#c4c7c5] hover:text-white absolute right-3 top-2.5 flex items-center justify-center transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Sort Selector with M3 styling */}
        <div className="relative">
          <select
            value={sortBy}
            onChange={(e) => {
              playTapSound();
              setSortBy(e.target.value as any);
            }}
            className="py-2.5 pl-3.5 pr-8 rounded-full bg-[#1e1f23] text-xs text-[#c4c7c5] focus:outline-none focus:ring-2 focus:ring-[#a8f09b] cursor-pointer appearance-none border border-white/[0.06]"
            aria-label="Sort"
          >
            <option value="newest">{t.sortNewest}</option>
            <option value="oldest">{t.sortOldest}</option>
            <option value="favoritesFirst">{t.sortFavorites}</option>
            <option value="alphabetical">{t.sortAlphabetical}</option>
          </select>
          <SlidersHorizontal className="w-3.5 h-3.5 text-[#8e918f] absolute right-3 top-3.5 pointer-events-none" />
        </div>

        {/* View mode toggle */}
        <div className="flex bg-[#1e1f23] rounded-full p-1 border border-white/[0.06]">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-1.5 rounded-full transition-colors ${
              viewMode === 'grid' ? 'bg-[#394738] text-[#a8f09b]' : 'text-[#8e918f]'
            }`}
            aria-label="Grid"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-1.5 rounded-full transition-colors ${
              viewMode === 'list' ? 'bg-[#394738] text-[#a8f09b]' : 'text-[#8e918f]'
            }`}
            aria-label="List"
          >
            <ListIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Material You 3 Filter Chips (Horizontal Scroll) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {/* 'All' chip */}
        <button
          onClick={() => {
            playTapSound();
            setSelectedFolderId('all');
          }}
          className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-200 flex items-center gap-2 shrink-0 ${
            selectedFolderId === 'all'
              ? 'bg-[#a8f09b] text-[#0b3810] font-bold shadow-md'
              : 'bg-[#1e1f23] text-[#c4c7c5] hover:bg-[#282a2f] border border-white/[0.04]'
          }`}
        >
          <span>{t.allCodesChip}</span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
            selectedFolderId === 'all' ? 'bg-[#0b3810]/20 text-[#0b3810]' : 'bg-[#282a2f] text-[#8e918f]'
          }`}>
            {folderCounts.all}
          </span>
        </button>

        {/* 'Favorites' chip */}
        <button
          onClick={() => {
            playTapSound();
            setSelectedFolderId('favorites');
          }}
          className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-200 flex items-center gap-2 shrink-0 ${
            selectedFolderId === 'favorites'
              ? 'bg-[#ffdcc2] text-[#2e1500] font-bold shadow-md'
              : 'bg-[#1e1f23] text-[#c4c7c5] hover:bg-[#282a2f] border border-white/[0.04]'
          }`}
        >
          <Star className={`w-3.5 h-3.5 ${selectedFolderId === 'favorites' ? 'fill-[#2e1500]' : 'fill-[#ffdcc2] text-[#ffdcc2]'}`} />
          <span>{t.favoritesChip}</span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
            selectedFolderId === 'favorites' ? 'bg-[#2e1500]/20 text-[#2e1500]' : 'bg-[#282a2f] text-[#8e918f]'
          }`}>
            {folderCounts.favorites}
          </span>
        </button>

        {/* Folder items as M3 Filter Chips with localized names */}
        {folders.map((f) => {
          const isSelected = selectedFolderId === f.id;
          const count = folderCounts[f.id] || 0;
          const localizedName = getLocalizedFolderName(f.id, f.name, lang);
          return (
            <button
              key={f.id}
              onClick={() => {
                playTapSound();
                setSelectedFolderId(f.id);
              }}
              className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-200 flex items-center gap-2 shrink-0 ${
                isSelected
                  ? 'bg-[#394738] text-[#a8f09b] font-bold shadow-md border border-[#a8f09b]/30'
                  : 'bg-[#1e1f23] text-[#c4c7c5] hover:bg-[#282a2f] border border-white/[0.04]'
              }`}
            >
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: f.color }}
              />
              <span>{localizedName}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                isSelected ? 'bg-[#244927] text-[#c4fbb8]' : 'bg-[#282a2f] text-[#8e918f]'
              }`}>
                {count}
              </span>
            </button>
          );
        })}

        {/* Add Folder button (M3 Assist Chip) */}
        <button
          onClick={() => {
            playTapSound();
            onOpenCreateFolder();
          }}
          className="px-3.5 py-2 rounded-full text-xs font-semibold whitespace-nowrap bg-[#1e1f23] border border-dashed border-[#a8f09b]/50 text-[#a8f09b] hover:bg-[#a8f09b]/10 transition-colors flex items-center gap-1.5 shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{t.newFolderChip}</span>
        </button>
      </div>

      {/* Main Grid / List of Items (Material You 3 Cards) */}
      {displayedItems.length === 0 ? (
        <div className="flex-1 min-h-[300px] flex flex-col items-center justify-center p-8 text-center bg-[#1e1f23] rounded-[28px] space-y-4 border border-white/[0.04]">
          <div className="w-16 h-16 rounded-full bg-[#282a2f] flex items-center justify-center text-[#8e918f]">
            <QrCode className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h4 className="font-bold text-base text-[#e3e2e6]">
              {searchQuery ? t.emptySearchTitle : t.emptyTitle}
            </h4>
            <p className="text-xs text-[#8e918f] max-w-xs leading-relaxed">
              {searchQuery ? t.emptySearchDesc : t.emptyDesc}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                playTapSound();
                onNavigateToScan();
              }}
              className="py-2.5 px-5 rounded-full bg-[#a8f09b] hover:brightness-105 active:scale-95 text-[#0b3810] font-bold text-xs transition-all shadow-sm"
            >
              {t.scanFirstBtn}
            </button>
            <button
              onClick={() => {
                playTapSound();
                onNavigateToCreate();
              }}
              className="py-2.5 px-5 rounded-full bg-[#282a2f] hover:bg-[#33353a] text-[#e3e2e6] font-semibold text-xs transition-colors"
            >
              {t.createFirstBtn}
            </button>
          </div>
        </div>
      ) : (
        <div
          className={`grid gap-3.5 ${
            viewMode === 'grid'
              ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
              : 'grid-cols-1'
          }`}
        >
          {displayedItems.map((item) => {
            const folder = folders.find((f) => f.id === item.folderId) || folders[0];
            const localizedFolderName = getLocalizedFolderName(folder.id, folder.name, lang);
            const dateStr = new Date(item.createdAt).toLocaleDateString(lang === 'ru' ? 'ru' : 'en-US', {
              day: 'numeric',
              month: 'short',
            });

            return (
              <div
                key={item.id}
                className="group relative bg-[#1e1f23] hover:bg-[#24262b] rounded-[24px] p-4 transition-all duration-200 shadow-md hover:shadow-xl flex flex-col justify-between border border-white/[0.04]"
              >
                {/* Top Row: Folder Tag & Favorite Star */}
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-[#282a2f] text-[#e3e2e6]">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: folder.color }}
                    />
                    <span className="truncate max-w-[130px]">{localizedFolderName}</span>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      playTapSound();
                      onToggleFavorite(item.id);
                    }}
                    className="w-8 h-8 rounded-full bg-white/[0.04] hover:bg-white/[0.08] flex items-center justify-center transition-colors"
                    aria-label="Favorite"
                  >
                    <Star
                      className={`w-4 h-4 ${
                        item.isFavorite
                          ? 'fill-[#ffdcc2] text-[#ffdcc2]'
                          : 'text-[#8e918f]'
                      }`}
                    />
                  </button>
                </div>

                {/* Center Content: Crisp QR Thumbnail + Info */}
                <div
                  onClick={() => {
                    playTapSound();
                    onSelectItem(item);
                  }}
                  className="flex items-start gap-3.5 cursor-pointer select-none"
                >
                  <div className="w-18 h-18 sm:w-20 sm:h-20 shrink-0 bg-white p-1 rounded-2xl shadow-sm flex items-center justify-center overflow-hidden border border-black/10">
                    {thumbnails[item.id] ? (
                      <img
                        src={thumbnails[item.id]}
                        alt={item.title}
                        className="w-full h-full object-contain image-rendering-pixelated"
                      />
                    ) : (
                      <div className="w-4 h-4 border-2 border-slate-400 border-t-slate-800 rounded-full animate-spin" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h5 className="font-bold text-sm text-[#e3e2e6] group-hover:text-[#a8f09b] transition-colors leading-tight line-clamp-2">
                      {item.title}
                    </h5>
                    {item.notes && (
                      <p className="text-xs text-[#8e918f] mt-1 line-clamp-1">
                        {item.notes}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-2 text-[10px] text-[#8e918f]">
                      <span className="px-2 py-0.5 rounded-md bg-[#282a2f]">{getSourceBadge(item.source)}</span>
                      <span>{dateStr}</span>
                    </div>
                  </div>
                </div>

                {/* Quick Action Footer */}
                <div className="flex items-center justify-between pt-3 mt-3 border-t border-white/[0.04]">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      playTapSound();
                      onOpenTurnstile(item);
                    }}
                    className="py-1.5 px-3.5 rounded-full bg-[#244927] hover:bg-[#2f5c33] text-[#c4fbb8] text-xs font-semibold flex items-center gap-1.5 transition-colors active:scale-95 shadow-sm"
                    title={t.turnstileBtn}
                  >
                    <Maximize2 className="w-3.5 h-3.5 text-[#a8f09b]" />
                    <span>{t.turnstileBtn}</span>
                  </button>

                  <div className="flex items-center gap-1">
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          playTapSound();
                          setMovingItemId(movingItemId === item.id ? null : item.id);
                        }}
                        className="w-8 h-8 rounded-full bg-[#282a2f] hover:bg-[#33353a] text-[#c4c7c5] hover:text-[#e3e2e6] flex items-center justify-center transition-colors"
                        title={t.moveToFolderTooltip}
                      >
                        <FolderInput className="w-4 h-4" />
                      </button>

                      {movingItemId === item.id && (
                        <div
                          className="absolute right-0 bottom-full mb-1 z-30 w-48 bg-[#282a2f] border border-white/[0.08] rounded-2xl shadow-2xl p-2 space-y-1 animate-in fade-in"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="text-[10px] uppercase font-bold text-[#8e918f] px-2 py-1">
                            {t.moveToTitle}
                          </div>
                          {folders.map((f) => (
                            <button
                              key={f.id}
                              onClick={() => {
                                playTapSound();
                                onMoveItem(item.id, f.id);
                                setMovingItemId(null);
                              }}
                              className={`w-full text-left px-2.5 py-1.5 rounded-xl text-xs flex items-center gap-2 hover:bg-[#33353a] transition-colors ${
                                item.folderId === f.id ? 'text-[#a8f09b] font-bold bg-[#394738]/50' : 'text-[#e3e2e6]'
                              }`}
                            >
                              <span
                                className="w-2 h-2 rounded-full shrink-0"
                                style={{ backgroundColor: f.color }}
                              />
                              <span className="truncate">{getLocalizedFolderName(f.id, f.name, lang)}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`${t.deleteConfirm} («${item.title}»)`)) {
                          playTapSound();
                          onDeleteItem(item.id);
                        }
                      }}
                      className="w-8 h-8 rounded-full bg-[#282a2f] hover:bg-[#93000a] text-[#c4c7c5] hover:text-[#ffdad6] flex items-center justify-center transition-colors"
                      title={t.deleteTooltip}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* M3 Backup and Restore Bar */}
      <div className="pt-4 border-t border-white/[0.04] flex flex-wrap items-center justify-between gap-2 text-xs text-[#8e918f]">
        <span>
          {t.totalSavedFooter}: {items.length} • {folders.length}
        </span>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              playTapSound();
              onExportBackup();
            }}
            className="px-3.5 py-1.5 rounded-full bg-[#1e1f23] hover:bg-[#282a2f] text-[#c4c7c5] hover:text-[#e3e2e6] text-xs font-semibold flex items-center gap-1.5 transition-colors border border-white/[0.04]"
          >
            <Download className="w-3.5 h-3.5 text-[#a8f09b]" />
            <span>{t.backupBtn}</span>
          </button>

          <label className="px-3.5 py-1.5 rounded-full bg-[#1e1f23] hover:bg-[#282a2f] text-[#c4c7c5] hover:text-[#e3e2e6] text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-white/[0.04]">
            <Upload className="w-3.5 h-3.5 text-[#a8c7fa]" />
            <span>{t.restoreBtn}</span>
            <input
              type="file"
              accept=".json"
              onChange={handleFileImport}
              className="hidden"
            />
          </label>
        </div>
      </div>
    </div>
  );
}
