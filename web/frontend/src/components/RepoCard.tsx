import React from 'react';
import { ExternalLink, Star, GitFork, Code } from 'lucide-react';
import { RepoMetadata } from '../types/chat';

interface RepoCardProps {
  repo: RepoMetadata;
}

export const RepoCard: React.FC<RepoCardProps> = ({ repo }) => {
  return (
    <div className="mt-3 p-3.5 rounded-2xl bg-zinc-950/80 light:bg-slate-50 border border-zinc-800/80 light:border-slate-200 hover:border-indigo-500/40 light:hover:border-indigo-300 transition-all duration-300 shadow-xl light:shadow-sm group">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-500/10 light:bg-indigo-100 border border-indigo-500/20 light:border-indigo-200 flex items-center justify-center text-indigo-400 light:text-indigo-600 group-hover:scale-105 transition-transform shadow-inner">
            <Code className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-bold text-zinc-100 light:text-slate-900 text-xs sm:text-sm tracking-tight group-hover:text-indigo-300 light:group-hover:text-indigo-600 transition-colors">
              {repo.name}
            </h4>
            <span className="text-[10px] text-indigo-400/80 light:text-indigo-600 font-mono tracking-wider">{repo.language}</span>
          </div>
        </div>
        <a
          href={repo.url}
          target="_blank"
          rel="noopener noreferrer"
          className="p-1.5 rounded-xl bg-zinc-900 light:bg-white border border-zinc-800 light:border-slate-200 text-zinc-400 light:text-slate-600 hover:text-white light:hover:text-indigo-600 hover:bg-indigo-600 light:hover:bg-indigo-50 transition-all flex items-center justify-center shadow-sm active:scale-95"
          title="Mở GitHub Repository"
        >
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      <p className="text-xs text-zinc-300 light:text-slate-600 mt-2.5 leading-relaxed font-normal">
        {repo.description}
      </p>

      <div className="flex items-center gap-4 mt-3 pt-2.5 border-t border-zinc-800/60 light:border-slate-200 text-[11px] text-zinc-400 light:text-slate-500 font-mono tabular-nums">
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-zinc-900/60 light:bg-white border border-zinc-800/60 light:border-slate-200">
          <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400/20" />
          <span className="text-zinc-300 light:text-slate-700 font-medium">{repo.stars} stars</span>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-zinc-900/60 light:bg-white border border-zinc-800/60 light:border-slate-200">
          <GitFork className="w-3.5 h-3.5 text-zinc-400 light:text-slate-500" />
          <span className="text-zinc-300 light:text-slate-700 font-medium">{repo.forks} forks</span>
        </div>
      </div>
    </div>
  );
};
