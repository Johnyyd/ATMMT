import React from 'react';
import { Check, X } from 'lucide-react';

interface PasswordStrengthMeterProps {
  password: string;
  className?: string;
  showChecklist?: boolean;
}

export const PasswordStrengthMeter: React.FC<PasswordStrengthMeterProps> = ({
  password,
  className = '',
  showChecklist = true,
}) => {
  const criteria = [
    { label: 'Tối thiểu 8 ký tự', met: password.length >= 8 },
    { label: 'Ít nhất 1 chữ thường (a-z)', met: /[a-z]/.test(password) },
    { label: 'Ít nhất 1 chữ hoa (A-Z)', met: /[A-Z]/.test(password) },
    { label: 'Ít nhất 1 chữ số (0-9)', met: /[0-9]/.test(password) },
    { label: 'Ít nhất 1 ký tự đặc biệt (!@#$...)', met: /[!@#$%^&*(),.?":{}|<>]/.test(password) },
  ];

  const metCount = criteria.filter((c) => c.met).length;

  let strengthLabel = 'Chưa nhập';
  let strengthColor = 'bg-slate-700';
  let textColor = 'text-slate-400';

  if (password.length > 0) {
    if (metCount <= 2) {
      strengthLabel = 'Rất yếu';
      strengthColor = 'bg-red-500';
      textColor = 'text-red-400';
    } else if (metCount === 3) {
      strengthLabel = 'Trung bình';
      strengthColor = 'bg-amber-500';
      textColor = 'text-amber-400';
    } else if (metCount === 4) {
      strengthLabel = 'Khá';
      strengthColor = 'bg-blue-500';
      textColor = 'text-blue-400';
    } else {
      strengthLabel = 'Mạnh (Đạt chuẩn chính sách)';
      strengthColor = 'bg-emerald-500';
      textColor = 'text-emerald-400';
    }
  }

  return (
    <div className={`space-y-2 mt-1.5 ${className}`}>
      {/* Strength Progress Bar */}
      <div className="space-y-1">
        <div className="flex justify-between items-center text-xs">
          <span className="text-slate-400">Độ an toàn:</span>
          <span className={`font-semibold ${textColor}`}>{strengthLabel}</span>
        </div>
        <div className="grid grid-cols-5 gap-1.5 h-1.5">
          {[1, 2, 3, 4, 5].map((level) => (
            <div
              key={level}
              className={`h-full rounded-full transition-all duration-300 ${
                level <= metCount && password.length > 0
                  ? strengthColor
                  : 'bg-slate-700/60'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Visual Checklist */}
      {showChecklist && (
        <div className="pt-1.5 grid grid-cols-1 sm:grid-cols-2 gap-1 text-[11px]">
          {criteria.map((item, idx) => (
            <div
              key={idx}
              className={`flex items-center gap-1.5 transition-colors duration-200 ${
                item.met ? 'text-emerald-400' : 'text-slate-500'
              }`}
            >
              {item.met ? (
                <Check className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
              ) : (
                <X className="w-3.5 h-3.5 shrink-0 text-slate-600" />
              )}
              <span className={item.met ? 'font-medium' : ''}>{item.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
