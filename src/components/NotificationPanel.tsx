import { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Notification } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, CheckCircle, Flame, MessageSquare, AlertTriangle } from 'lucide-react';
import { cn } from '../lib/utils';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrors';

export default function NotificationPanel() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, 'notifications'),
      orderBy('createdAt', 'desc'),
      limit(20)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Notification[];
      setNotifications(docs);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'notifications');
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const markAsRead = async (id: string) => {
    try {
      await updateDoc(doc(db, 'notifications', id), { read: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `notifications/${id}`);
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="bg-white border border-slate-200 rounded-sm overflow-hidden flex flex-col h-full shadow-sm">
      <div className="p-6 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Bell className="w-5 h-5 text-slate-900" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[8px] font-black rounded-full flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </div>
          <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-900">Protocol Notifics</h2>
        </div>
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">
          Live Feed
        </span>
      </div>

      <div className="flex-1 overflow-y-auto max-h-[400px] xl:max-h-[600px] divide-y divide-slate-100">
        {loading ? (
          <div className="p-12 text-center text-slate-300 animate-pulse uppercase text-[10px] font-black tracking-widest">
            Scanning Channels...
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center gap-4">
            <Bell className="w-8 h-8 text-slate-100" />
            <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">Silence Detected</p>
          </div>
        ) : (
          <AnimatePresence>
            {notifications.map((notif) => (
              <motion.div
                key={notif.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className={cn(
                  "p-5 transition-colors cursor-pointer group hover:bg-slate-50",
                  !notif.read ? "bg-emerald-50/30 border-l-2 border-l-emerald-500" : "border-l-2 border-l-transparent"
                )}
                onClick={() => !notif.read && markAsRead(notif.id)}
              >
                <div className="flex gap-4">
                  <div className={cn(
                    "w-8 h-8 rounded-sm flex items-center justify-center shrink-0 border",
                    notif.type === 'hot_lead' ? "bg-orange-50 border-orange-200 text-orange-500" :
                    notif.type === 'qualification_complete' ? "bg-emerald-50 border-emerald-200 text-emerald-500" :
                    "bg-slate-50 border-slate-200 text-slate-400"
                  )}>
                    {notif.type === 'hot_lead' ? <Flame className="w-4 h-4" /> :
                     notif.type === 'qualification_complete' ? <CheckCircle className="w-4 h-4" /> :
                     <MessageSquare className="w-4 h-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest mb-1 truncate">
                      {notif.title}
                    </p>
                    <p className="text-xs text-slate-600 leading-relaxed font-medium line-clamp-2">
                      {notif.message}
                    </p>
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.1em]">
                        {notif.createdAt?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {!notif.read && (
                        <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-1">
                          <div className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse" />
                          New Arrival
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
