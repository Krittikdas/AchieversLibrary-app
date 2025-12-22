import React, { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronDown, Check, X } from 'lucide-react';

export type DateRangeOption = 'ALL' | '7_DAYS' | '30_DAYS' | '1_YEAR' | 'CUSTOM';

interface DateRangeFilterProps {
    onRangeChange: (start: Date | null, end: Date | null) => void;
    className?: string;
}

export const DateRangeFilter: React.FC<DateRangeFilterProps> = ({ onRangeChange, className }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedOption, setSelectedOption] = useState<DateRangeOption>('7_DAYS'); // Default to last 7 days usually better than All for dashboards, or user preference
    const [customStart, setCustomStart] = useState('');
    const [customEnd, setCustomEnd] = useState('');
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const applyRange = (option: DateRangeOption, start?: string, end?: string) => {
        const today = new Date();
        // Set time to end of day for precise filtering (inclusive)
        const endDate = new Date(today);
        endDate.setHours(23, 59, 59, 999);

        let startDate: Date | null = null;
        let finalEndDate: Date | null = endDate;

        switch (option) {
            case '7_DAYS':
                startDate = new Date(today);
                startDate.setDate(today.getDate() - 6); // Last 7 days inclusive
                startDate.setHours(0, 0, 0, 0);
                break;
            case '30_DAYS':
                startDate = new Date(today);
                startDate.setDate(today.getDate() - 29);
                startDate.setHours(0, 0, 0, 0);
                break;
            case '1_YEAR':
                startDate = new Date(today);
                startDate.setFullYear(today.getFullYear() - 1);
                startDate.setHours(0, 0, 0, 0);
                break;
            case 'ALL':
                startDate = null;
                finalEndDate = null;
                break;
            case 'CUSTOM':
                if (start && end) {
                    startDate = new Date(start);
                    startDate.setHours(0, 0, 0, 0);
                    finalEndDate = new Date(end);
                    finalEndDate.setHours(23, 59, 59, 999);
                } else {
                    return; // Don't apply if incomplete
                }
                break;
        }

        setSelectedOption(option);
        onRangeChange(startDate, finalEndDate);
        if (option !== 'CUSTOM') setIsOpen(false);
    };

    const handleCustomApply = () => {
        if (customStart && customEnd) {
            applyRange('CUSTOM', customStart, customEnd);
            setIsOpen(false);
        }
    };

    const getLabel = () => {
        switch (selectedOption) {
            case 'ALL': return 'All Time';
            case '7_DAYS': return 'Last 7 Days';
            case '30_DAYS': return 'Last 30 Days';
            case '1_YEAR': return 'Last 1 Year';
            case 'CUSTOM': return customStart && customEnd ? `${new Date(customStart).toLocaleDateString()} - ${new Date(customEnd).toLocaleDateString()}` : 'Custom Range';
            default: return 'Select Date';
        }
    };

    return (
        <div className={`relative ${className}`} ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg shadow-sm hover:bg-slate-50 transition-colors text-sm font-medium text-slate-700 w-full md:w-auto justify-between md:justify-start"
            >
                <div className="flex items-center gap-2">
                    <Calendar size={16} className="text-slate-500" />
                    <span>{getLabel()}</span>
                </div>
                <ChevronDown size={14} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute top-full mt-2 right-0 w-72 bg-white rounded-xl shadow-xl border border-slate-200 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                    <div className="p-2 space-y-1">
                        {[
                            { id: '7_DAYS', label: 'Last 7 Days' },
                            { id: '30_DAYS', label: 'Last 30 Days' },
                            { id: '1_YEAR', label: 'Last 1 Year' },
                            { id: 'ALL', label: 'All Time' },
                        ].map((opt) => (
                            <button
                                key={opt.id}
                                onClick={() => applyRange(opt.id as DateRangeOption)}
                                className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg transition-colors ${selectedOption === opt.id
                                    ? 'bg-indigo-50 text-indigo-700 font-medium'
                                    : 'text-slate-700 hover:bg-slate-50'
                                    }`}
                            >
                                {opt.label}
                                {selectedOption === opt.id && <Check size={14} />}
                            </button>
                        ))}

                        <div className="border-t border-slate-100 my-1 pt-1">
                            <button
                                onClick={() => setSelectedOption('CUSTOM')}
                                className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg transition-colors ${selectedOption === 'CUSTOM'
                                    ? 'bg-indigo-50 text-indigo-700 font-medium'
                                    : 'text-slate-700 hover:bg-slate-50'
                                    }`}
                            >
                                Custom Range
                                {selectedOption === 'CUSTOM' && <Check size={14} />}
                            </button>

                            {selectedOption === 'CUSTOM' && (
                                <div className="p-2 space-y-3 bg-slate-50 rounded-lg mt-1 mx-1 border border-slate-100">
                                    <div>
                                        <label className="text-xs font-medium text-slate-500 block mb-1">Start Date</label>
                                        <input
                                            type="date"
                                            value={customStart}
                                            onChange={(e) => setCustomStart(e.target.value)}
                                            className="w-full text-sm border border-slate-200 rounded px-2 py-1"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-slate-500 block mb-1">End Date</label>
                                        <input
                                            type="date"
                                            value={customEnd}
                                            onChange={(e) => setCustomEnd(e.target.value)}
                                            className="w-full text-sm border border-slate-200 rounded px-2 py-1"
                                        />
                                    </div>
                                    <button
                                        onClick={handleCustomApply}
                                        disabled={!customStart || !customEnd}
                                        className="w-full bg-indigo-600 text-white text-xs font-medium py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Apply Range
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
