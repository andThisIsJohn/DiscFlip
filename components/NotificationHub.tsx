
import React from 'react';
import { User, AppNotification, AppNotificationType } from '../types';

interface NotificationHubProps {
    user: User;
    onClose: () => void;
    onRead: (id: string) => void;
    onAction: (notification: AppNotification) => void;
}

const NotificationHub: React.FC<NotificationHubProps> = ({ user, onClose, onRead, onAction }) => {
    const notifications = user.notifications || [];
    const unreadCount = notifications.filter(n => !n.isRead).length;

    const getIcon = (type: AppNotificationType) => {
        switch(type) {
            case AppNotificationType.Outbid: return '🔥';
            case AppNotificationType.OfferAccepted: return '✅';
            case AppNotificationType.EndingSoon: return '⏰';
            case AppNotificationType.ItemSold: return '💰';
            case AppNotificationType.PaymentReceived: return '🏦';
            case AppNotificationType.ItemShipped: return '🏷️';
            case AppNotificationType.CarrierScanned: return '📦';
            case AppNotificationType.OutForDelivery: return '🚚';
            case AppNotificationType.Delivered: return '🏠';
            case AppNotificationType.ShipDeadlineReminder: return '⏳';
            case AppNotificationType.HighRiskAlert: return '🚨';
            case AppNotificationType.OrderIssueReported: return '⚠️';
            case AppNotificationType.ReportActionTaken: return '🛡️';
            default: return '📢';
        }
    };

    const getColors = (type: AppNotificationType) => {
        switch(type) {
            case AppNotificationType.HighRiskAlert:
            case AppNotificationType.ShipDeadlineReminder:
                return 'bg-red-50 text-red-600 border-red-100';
            case AppNotificationType.Delivered:
            case AppNotificationType.PaymentReceived:
                return 'bg-green-50 text-green-600 border-green-100';
            case AppNotificationType.ItemSold:
            case AppNotificationType.ItemShipped:
                return 'bg-blue-50 text-blue-600 border-blue-100';
            case AppNotificationType.ReportActionTaken:
                return 'bg-indigo-50 text-indigo-600 border-indigo-100';
            default:
                return 'bg-white text-slate-600 border-slate-100';
        }
    };

    return (
        <div className="absolute right-0 top-16 w-96 bg-white border border-slate-100 shadow-2xl rounded-[32px] overflow-hidden z-[100] animate-in slide-in-from-top-4 duration-300">
            <div className="p-6 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                <div>
                    <h3 className="text-sm font-black text-black uppercase tracking-widest">Market Feed</h3>
                    <p className="text-[10px] text-slate-400 font-black uppercase">{unreadCount} New Events</p>
                </div>
                <button onClick={onClose} className="text-slate-300 hover:text-black">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
            </div>

            <div className="max-h-[450px] overflow-y-auto no-scrollbar">
                {notifications.length > 0 ? (
                    notifications.map(notif => (
                        <div 
                            key={notif.id} 
                            onClick={() => { onRead(notif.id); onAction(notif); }}
                            className={`p-6 border-b border-slate-50 cursor-pointer transition-all hover:bg-slate-50 flex gap-4 ${!notif.isRead ? 'bg-slate-50/30' : 'bg-white'}`}
                        >
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shadow-sm border ${getColors(notif.type)}`}>
                                {getIcon(notif.type)}
                            </div>
                            <div className="flex-grow min-w-0">
                                <h4 className={`text-[11px] font-black uppercase mb-1 truncate ${notif.type === AppNotificationType.HighRiskAlert ? 'text-red-600' : 'text-black'}`}>
                                    {notif.title}
                                </h4>
                                <p className="text-[10px] text-slate-500 font-medium leading-tight line-clamp-2">{notif.message}</p>
                                <span className="text-[8px] text-slate-300 font-black uppercase mt-2 block">
                                    {new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                            {!notif.isRead && (
                                <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 animate-pulse ${
                                    notif.type === AppNotificationType.HighRiskAlert ? 'bg-red-600' : 'bg-orange-600'
                                }`} />
                            )}
                        </div>
                    ))
                ) : (
                    <div className="p-24 text-center">
                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-200">
                             <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                        </div>
                        <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">No active signals</p>
                    </div>
                )}
            </div>
            
            <div className="p-4 bg-white text-center border-t border-slate-100">
                <button className="text-[9px] font-black text-orange-600 uppercase tracking-[0.2em] hover:underline">View All Activities</button>
            </div>
        </div>
    );
};

export default NotificationHub;
