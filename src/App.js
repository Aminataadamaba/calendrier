import React, { useState, useEffect, useRef } from 'react';
import { Calendar, Clock, Users, FileText, BarChart3, Plus, X, Trash2, Download, ChevronLeft, ChevronRight, Play, Pause, RotateCcw, Coffee, Briefcase, Bell, TrendingUp, Check, Moon, Sun, Search, Upload, Filter} from 'lucide-react';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';

// ============================================
// SYSTÈME DE PERSISTANCE - UNIQUEMENT LOCALSTORAGE
// ============================================
const CloudStorage = {
  get(key) {
    try {
      const data = localStorage.getItem(key);
      if (data) {
        console.log(`✅ Données chargées: ${key}`);
        return JSON.parse(data);
      }
      console.log(`ℹ️ Aucune donnée pour: ${key}`);
      return null;
    } catch (error) {
      console.error(`❌ Erreur chargement ${key}:`, error);
      return null;
    }
  },
  
  set(key, value) {
    try {
      const stringValue = JSON.stringify(value);
      localStorage.setItem(key, stringValue);
      console.log(`💾 Sauvegardé: ${key}`, Array.isArray(value) ? `${value.length} items` : 'objet');
      return true;
    } catch (error) {
      console.error(`❌ Erreur sauvegarde ${key}:`, error);
      return false;
    }
  },
  
  clear() {
    const keys = ['activities', 'clients', 'notes', 'projects', 'tasks', 'reminders', 'sessions'];
    keys.forEach(key => localStorage.removeItem(key));
    console.log('🗑️ Tout le storage a été vidé');
  }
};

export default function ProManager() {
  const [darkMode, setDarkMode] = useState(false);
  const [currentView, setCurrentView] = useState('calendar');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [viewMode, setViewMode] = useState('month');

  // États des données
  const [activities, setActivities] = useState([]);
  const [clients, setClients] = useState([]);
  const [notes, setNotes] = useState([]);
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [reminders, setReminders] = useState([]);
  
  // États UI
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [showClientModal, setShowClientModal] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterProject, setFilterProject] = useState('');
  const [alarmPlaying, setAlarmPlaying] = useState(false);

  // Chronomètre
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [selectedProject, setSelectedProject] = useState('');
  const [workMinutes, setWorkMinutes] = useState(25);
  const [breakMinutes, setBreakMinutes] = useState(5);
  const [timerMode] = useState('work');
  const [sessions, setSessions] = useState([]);
  const [todayWorkMinutes, setTodayWorkMinutes] = useState(0);
  
  const audioRef = useRef(null);// ============================================
  // CHARGEMENT INITIAL
  // ============================================
  useEffect(() => {
    loadAllData();
    checkReminders();
    const interval = setInterval(checkReminders, 60000);
    return () => clearInterval(interval);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const requestNotifPermission = () => {
      if ("Notification" in window && Notification.permission === "default") {
        Notification.requestPermission();
      }
      document.removeEventListener('click', requestNotifPermission);
    };
    
    document.addEventListener('click', requestNotifPermission);
    return () => document.removeEventListener('click', requestNotifPermission);
  }, []);

  useEffect(() => {
    const savedDarkMode = localStorage.getItem('darkMode');
    if (savedDarkMode !== null) {
      setDarkMode(savedDarkMode === 'true');
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setDarkMode(prefersDark);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('darkMode', darkMode);
    document.body.style.background = darkMode 
      ? 'linear-gradient(135deg, #1e293b 0%, #334155 50%, #475569 100%)'
      : 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 50%, #60a5fa 100%)';
  }, [darkMode]);
  
  function loadAllData() {
    const data = [
      CloudStorage.get('activities'),
      CloudStorage.get('clients'),
      CloudStorage.get('notes'),
      CloudStorage.get('projects'),
      CloudStorage.get('tasks'),
      CloudStorage.get('reminders'),
      CloudStorage.get('sessions')
    ];
    
    if (data[0]) setActivities(data[0]);
    if (data[1]) setClients(data[1]);
    if (data[2]) setNotes(data[2]);
    if (data[3]) setProjects(data[3]);
    if (data[4]) setTasks(data[4]);
    if (data[5]) setReminders(data[5]);
    if (data[6]) {
      setSessions(data[6]);
      calculateTodayWork(data[6]);
    }
    
    console.log('✅ Toutes les données chargées');
  }
    
  // ============================================
  // SAUVEGARDE AUTOMATIQUE
  // ============================================
  useEffect(() => { 
    if (activities.length > 0) {
      console.log('💾 Sauvegarde activities:', activities.length);
    }
    CloudStorage.set('activities', activities); 
  }, [activities]);
  
  useEffect(() => { 
    if (clients.length > 0) {
      console.log('💾 Sauvegarde clients:', clients.length);
    }
    CloudStorage.set('clients', clients); 
  }, [clients]);
  
  useEffect(() => { 
    if (notes.length > 0) {
      console.log('💾 Sauvegarde notes:', notes.length);
    }
    CloudStorage.set('notes', notes); 
  }, [notes]);
  
  useEffect(() => { 
    if (projects.length > 0) {
      console.log('💾 Sauvegarde projects:', projects.length);
    }
    CloudStorage.set('projects', projects); 
  }, [projects]);
  
  useEffect(() => { 
    if (tasks.length > 0) {
      console.log('💾 Sauvegarde tasks:', tasks.length);
    }
    CloudStorage.set('tasks', tasks); 
  }, [tasks]);
  
  useEffect(() => { 
    if (reminders.length > 0) {
      console.log('💾 Sauvegarde reminders:', reminders.length);
    }
    CloudStorage.set('reminders', reminders); 
  }, [reminders]);
  
  useEffect(() => { 
    if (sessions.length > 0) {
      console.log('💾 Sauvegarde sessions:', sessions.length);
    }
    CloudStorage.set('sessions', sessions);
    calculateTodayWork(sessions);
  }, [sessions]);
  
  // ============================================
  // CHRONOMÈTRE
  // ============================================
  useEffect(() => {
    let interval;
    if (timerRunning) {
      interval = setInterval(() => {
        setTimerSeconds(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timerRunning]);
  
  function startTimer() {
    if (!selectedProject) {
      showNotification('⚠️ Sélectionnez un projet d\'abord', 'warning');
      return;
    }
    setTimerRunning(true);
  }
  
  function pauseTimer() {
    setTimerRunning(false);
  }
  
  function resetTimer() {
    setTimerRunning(false);
    
    if (timerSeconds > 0 && selectedProject) {
      const newSession = {
        id: Date.now(),
        project: selectedProject,
        duration: timerSeconds,
        date: new Date().toISOString(),
        type: timerMode
      };
      setSessions([...sessions, newSession]);
      showNotification(`✅ Session enregistrée: ${Math.floor(timerSeconds / 60)}min ${timerSeconds % 60}s`);
    }
    
    setTimerSeconds(0);
  }
  
  function calculateTodayWork(sessionsData) {
    const today = new Date().toISOString().split('T')[0];
    const todaySessions = sessionsData.filter(s => s.date.startsWith(today) && s.type === 'work');
    const total = todaySessions.reduce((sum, s) => sum + s.duration, 0);
    setTodayWorkMinutes(Math.floor(total / 60));
  }
  
  // ============================================
  // RAPPELS/ALARMES
  // ============================================
  function checkReminders() {
    const now = new Date();

    reminders.forEach(reminder => {
      const reminderDate = new Date(reminder.datetime);
      const diff = reminderDate - now;

      if (!reminder.notified && diff <= 60000 && diff > 0) {
        startAlarm();
        showNotification(`🔔 RAPPEL: ${reminder.title}`, 'alarm');

        setReminders(prev =>
          prev.map(r =>
            r.id === reminder.id ? { ...r, notified: true } : r
          )
        );
      }
    });
  }

  function startAlarm() {
    if (audioRef.current) {
      audioRef.current.loop = true;
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
      setAlarmPlaying(true);
    }
  }
  
  function stopAlarm() {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setAlarmPlaying(false);
  }
  
  function addReminder(reminder) {
    setReminders([...reminders, { 
      ...reminder, 
      id: Date.now(),
      notified: false 
    }]);
    setShowReminderModal(false);
    showNotification('Rappel ajouté');
  }
  
  function deleteReminder(id) {
    setReminders(reminders.filter(r => r.id !== id));
    showNotification('Rappel supprimé');
  }// ============================================
  // CRUD FONCTIONS
  // ============================================
  function addActivity(activity) {
    const newActivity = {
      ...activity,
      id: Date.now(),
      date: selectedDate.toISOString().split('T')[0]
    };
    setActivities([...activities, newActivity]);
    setShowActivityModal(false);
    showNotification('Activité ajoutée');
  }
  
  function deleteActivity(id) {
    setActivities(activities.filter(a => a.id !== id));
    showNotification('Activité supprimée');
  }
  
  function addClient(client) {
    setClients([...clients, { ...client, id: Date.now() }]);
    setShowClientModal(false);
    showNotification('Client ajouté');
  }
  
  function deleteClient(id) {
    setClients(clients.filter(c => c.id !== id));
  }
  
  function addNote(note) {
    setNotes([...notes, { ...note, id: Date.now(), createdAt: new Date().toISOString() }]);
    setShowNoteModal(false);
    showNotification('Note ajoutée');
  }
  
  function deleteNote(id) {
    setNotes(notes.filter(n => n.id !== id));
  }
  
  function addProject(project) {
    setProjects([...projects, { ...project, id: Date.now() }]);
    setShowProjectModal(false);
    showNotification('Projet ajouté');
  }
  
  function deleteProject(id) {
    setProjects(projects.filter(p => p.id !== id));
  }
  
  function addTask(task) {
    setTasks([...tasks, { ...task, id: Date.now(), completed: false }]);
    setShowTaskModal(false);
    showNotification('Tâche ajoutée');
  }
  
  function toggleTask(id) {
    setTasks(tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  }
  
  function deleteTask(id) {
    setTasks(tasks.filter(t => t.id !== id));
  }
  
  // ============================================
  // EXPORT PDF
  // ============================================
  function exportToPDF() {
    const doc = new jsPDF();
    const dateStr = selectedDate.toLocaleDateString('fr-FR');
    
    doc.setFontSize(20);
    doc.text(`Emploi du temps - ${dateStr}`, 20, 20);
    
    doc.setFontSize(12);
    let y = 40;
    
    const dayActivities = getActivitiesForDate(selectedDate);
    
    if (dayActivities.length === 0) {
      doc.text('Aucune activite planifiee', 20, y);
    } else {
      dayActivities.forEach(activity => {
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
        
        doc.text(`${activity.startTime} - ${activity.endTime}`, 20, y);
        doc.text(`${activity.title}`, 60, y);
        doc.text(`[${activity.type}]`, 150, y);
        
        if (activity.client) {
          y += 7;
          doc.text(`Client: ${activity.client}`, 60, y);
        }
        
        if (activity.description) {
          y += 7;
          const desc = activity.description.substring(0, 60);
          doc.text(desc, 60, y);
        }
        
        y += 12;
      });
    }
    
    doc.save(`emploi-du-temps-${selectedDate.toISOString().split('T')[0]}.pdf`);
    showNotification('📄 PDF téléchargé');
  }
  
  // ============================================
  // EXPORT EXCEL
  // ============================================
  function exportToExcel() {
    const today = new Date().toISOString().split('T')[0];
    const todaySessions = sessions.filter(s => s.date.startsWith(today));
    
    const data = todaySessions.map(s => ({
      'Projet': s.project,
      'Durée (min)': Math.floor(s.duration / 60),
      'Type': s.type === 'work' ? 'Travail' : 'Pause',
      'Heure': new Date(s.date).toLocaleTimeString('fr-FR')
    }));
    
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sessions');
    
    XLSX.writeFile(wb, `sessions-${today}.xlsx`);
    showNotification('📊 Excel téléchargé');
  }
  
  // ============================================
  // EXPORT/IMPORT DONNÉES
  // ============================================
  function exportAllData() {
    const allData = {
      activities,
      clients,
      notes,
      projects,
      tasks,
      reminders,
      sessions,
      exportDate: new Date().toISOString()
    };
    
    const dataStr = JSON.stringify(allData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `manager-pro-backup-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    showNotification('💾 Données exportées');
  }

  function importData(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        
        if (data.activities) setActivities(data.activities);
        if (data.clients) setClients(data.clients);
        if (data.notes) setNotes(data.notes);
        if (data.projects) setProjects(data.projects);
        if (data.tasks) setTasks(data.tasks);
        if (data.reminders) setReminders(data.reminders);
        if (data.sessions) setSessions(data.sessions);
        
        showNotification('✅ Données importées avec succès');
      } catch (error) {
        showNotification('❌ Erreur lors de l\'import', 'warning');
      }
    };
    reader.readAsText(file);
  }
  
  // ============================================
  // FONCTIONS CALENDRIER
  // ============================================
  function getDaysInMonth(date) {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    const days = [];
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    return days;
  }
  
  function getActivitiesForDate(date) {
    if (!date) return [];
    const dateStr = date.toISOString().split('T')[0];
    let filtered = activities.filter(a => a.date === dateStr);
    
    // Recherche
    if (searchQuery) {
      filtered = filtered.filter(a => 
        a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (a.description && a.description.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }
    
    // Filtre projet
    if (filterProject) {
      filtered = filtered.filter(a => a.project === filterProject);
    }
    
    return filtered.sort((a, b) => a.startTime.localeCompare(b.startTime));
  }
  
  function calculateDuration(startTime, endTime) {
    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);
    return (endH * 60 + endM) - (startH * 60 + startM);
  }
  
  function getDayStats(date) {
    const dateStr = date.toISOString().split('T')[0];
    const dayActivities = activities.filter(a => a.date === dateStr);
    
    let workMinutes = 0;
    let breakMinutes = 0;
    let meetingMinutes = 0;
    
    dayActivities.forEach(activity => {
      const duration = calculateDuration(activity.startTime, activity.endTime);
      if (activity.type === 'work') workMinutes += duration;
      else if (activity.type === 'break' || activity.type === 'lunch') breakMinutes += duration;
      else if (activity.type === 'meeting') meetingMinutes += duration;
    });
    
    const totalMinutes = workMinutes + breakMinutes + meetingMinutes;
    
    return {
      workHours: (workMinutes / 60).toFixed(1),
      breakHours: (breakMinutes / 60).toFixed(1),
      meetingHours: (meetingMinutes / 60).toFixed(1),
      totalHours: (totalMinutes / 60).toFixed(1),
      productivity: totalMinutes > 0 ? ((workMinutes / totalMinutes) * 100).toFixed(0) : 0,
      activities: dayActivities.length
    };
  }
  
  // ============================================
  // STATISTIQUES HEBDOMADAIRES
  // ============================================
  function getWeekStats() {
    const today = new Date();
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    const weekActivities = activities.filter(a => {
      const actDate = new Date(a.date);
      return actDate >= weekAgo && actDate <= today;
    });
    
    let totalWork = 0;
    let totalBreak = 0;
    let totalMeetings = 0;
    
    weekActivities.forEach(activity => {
      const duration = calculateDuration(activity.startTime, activity.endTime);
      if (activity.type === 'work') totalWork += duration;
      else if (activity.type === 'break' || activity.type === 'lunch') totalBreak += duration;
      else if (activity.type === 'meeting') totalMeetings += duration;
    });
    
    return {
      workHours: (totalWork / 60).toFixed(1),
      breakHours: (totalBreak / 60).toFixed(1),
      meetingHours: (totalMeetings / 60).toFixed(1),
      totalHours: ((totalWork + totalBreak + totalMeetings) / 60).toFixed(1),
      avgPerDay: ((totalWork / 7) / 60).toFixed(1)
    };
  }
  
  function getWeekDays(date) {
    const curr = new Date(date);
    const first = curr.getDate() - curr.getDay();
    const days = [];
    
    for (let i = 0; i < 7; i++) {
      const day = new Date(curr.setDate(first + i));
      days.push(new Date(day));
    }
    return days;
  }
  
  // ============================================
  // NOTIFICATIONS
  // ============================================
  function showNotification(message, type = 'success') {
    // Notification visuelle dans l'app
    const notif = document.createElement('div');
    notif.className = `notification ${type}`;
    notif.textContent = message;
    document.body.appendChild(notif);

    setTimeout(() => {
      notif.classList.add('fade-out');
      setTimeout(() => notif.remove(), 300);
    }, 3000);

    // Notification système PWA
    if (type === 'alarm' && Notification.permission === 'granted') {
      new Notification(message, {
        icon: '/icon-192.png',
        vibrate: [200, 100, 200, 100, 200]
      });
    }
  }
  
  const dayStats = getDayStats(selectedDate);
  const weekStats = getWeekStats();
  const upcomingReminders = reminders.filter(r => !r.notified).slice(0, 5);return (
    <div className={`app ${darkMode ? 'dark' : ''}`}>
      <audio ref={audioRef} src="data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIGGS57OihUBELTKXh8LJnHgU2jdXvyoU0ByhxwuvfmUUND1Ot4+6qWBcLPJfZ77FpJAUtg9Pw2Ik2Bxhjtuzol1IQBSY7w+TfrEwUA0Sm3/G4bSQGLYLQ8tiJNgcYY7bs6JdSEAQlO8Pk36xMFANCpt/xuG0kBi2C0PLYiTYHGGO27OiXUhAEJTvD5N+sTBQDQqbf8bhtJAYtgtDy2Ik2BxhjtuzomFIQBCU7w+TfrEwUA0Km4PG4bCQGLYLQ8tiJNgcYY7bs6JdSEAQlO8Pk36xMFANCpt/xuG0kBi2C0PLYiTYHGGO27OiXUhAEJTvD5N+sTBQDQqbf8bhtJAYtgtDy2Ik2BxhjtuzoqFIQBCU7w+TfrEwUA0Km3/G4bSQGLYLQ8tiJNgcYY7bs6JdSEAQlO8Pk36xMFANCpt/xuG0kBi2C0PLYiTYHGGO27OiXUhAEJTvD5N+sTBQDQqbf8bhtJAYtgtDy2Ik2BxhjtuzoqFIQBCU7w+TfrEwUA0Km3/G4bSQGLYLQ8tiJNgcYY7bs6JdSEAQlO8Pk36xMFANCpt/xuG0kBi2C0PLYiTYHGGO27OiXUhAEJTvD5N+sTBQDQqbf8bhtJAYtgtDy2Ik2BxhjtuzoqFIQBCU7w+TfrEwUA0Km3/G4bSQGLYLQ8tiJNgcYY7bs6JdSEAQlO8Pk36xMFANCpt/xuG0kBi2C0PLYiTYHGGO27OiXUhAEJTvD5N+sTBQDQqbf8bhtJAYtgtDy2Ik2BxhjtuzoqFIQBCU7w+TfrEwUA0Km3/G4bSQGLYLQ8tiJNgcYY7bs6JdSEAQlO8Pk36xMFANCpt/xuG0kBi2C0PLYiTYHGGO27OiXUhAEJTvD5N+sTBQDQqbf8bhtJAYtgtDy2Ik2BxhjtuzoqFIQBCU7w+TfrEwUA0Km3/G4bSQGLYLQ8tiJNgcYY7bs6JdSEAQlO8Pk36xMFANCpt/xuG0kBi2C0PLYiTYHGGO27OiXUhAEJTvD5N+sTBQDQqbf8bhtJAYtgtDy2Ik2BxhjtuzoqFIQBCU7w+TfrEwUA0Km3/G4bSQGLYLQ8tiJNgcYY7bs6JdSEAQlO8Pk36xMFA" />
      
      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
          background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 50%, #60a5fa 100%);
          min-height: 100vh;
        }
        
        .app {
          min-height: 100vh;
          padding: 20px;
          color: #1e293b;
        }
        
        .header {
          background: white;
          padding: 20px 30px;
          border-radius: 20px;
          margin-bottom: 20px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.15);
        }
        
        .header h1 {
          font-size: clamp(1.5rem, 4vw, 2.2rem);
          background: linear-gradient(135deg, #1e3a8a, #3b82f6);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          font-weight: 900;
          margin-bottom: 10px;
        }
        
        .btn {
          padding: 12px 20px;
          border: none;
          border-radius: 12px;
          font-weight: 700;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          transition: all 0.3s;
          font-size: 0.9rem;
        }
        
        .btn-primary {
          background: linear-gradient(135deg, #3b82f6, #1e3a8a);
          color: white;
          box-shadow: 0 4px 15px rgba(59, 130, 246, 0.4);
        }
        
        .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(59, 130, 246, 0.5);
        }
        
        .btn-primary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }
        
        .btn-secondary {
          background: #f1f5f9;
          color: #475569;
          border: 2px solid #e2e8f0;
        }
        
        .btn-secondary:hover {
          background: #e2e8f0;
        }
        
        .btn-danger {
          background: linear-gradient(135deg, #ef4444, #dc2626);
          color: white;
        }
        
        .btn-small {
          padding: 8px 14px;
          font-size: 0.85rem;
        }
        
        .btn-success {
          background: linear-gradient(135deg, #10b981, #059669);
          color: white;
        }
        
        .btn-warning {
          background: linear-gradient(135deg, #f59e0b, #d97706);
          color: white;
        }
        
        .nav-tabs {
          background: white;
          padding: 10px;
          border-radius: 20px;
          margin-bottom: 20px;
          display: flex;
          gap: 8px;
          overflow-x: auto;
          box-shadow: 0 10px 40px rgba(0,0,0,0.1);
        }
        
        .nav-tab {
          padding: 12px 20px;
          border: none;
          border-radius: 12px;
          background: transparent;
          color: #64748b;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: all 0.2s;
          white-space: nowrap;
          font-size: clamp(0.8rem, 2vw, 0.95rem);
        }
        
        .nav-tab:hover {
          background: #f1f5f9;
        }
        
        .nav-tab.active {
          background: linear-gradient(135deg, #3b82f6, #1e3a8a);
          color: white;
          box-shadow: 0 4px 15px rgba(59, 130, 246, 0.3);
        }
        
        .content {
          background: white;
          padding: clamp(20px, 4vw, 35px);
          border-radius: 20px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.15);
          min-height: 400px;
        }
        
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 15px;
          margin-bottom: 20px;
        }
        
        .stat-card {
          padding: 20px;
          background: linear-gradient(135deg, #3b82f6, #1e3a8a);
          border-radius: 16px;
          color: white;
          box-shadow: 0 10px 30px rgba(59, 130, 246, 0.3);
          transition: transform 0.3s;
        }
        
        .stat-card:hover {
          transform: translateY(-3px);
        }
        
        .stat-value {
          font-size: clamp(1.8rem, 5vw, 2.5rem);
          font-weight: 900;
          margin-bottom: 5px;
        }
        
        .stat-label {
          font-size: clamp(0.75rem, 2vw, 0.9rem);
          opacity: 0.9;
          text-transform: uppercase;
          letter-spacing: 1px;
          font-weight: 600;
        }
        
        .calendar-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 25px;
          flex-wrap: wrap;
          gap: 15px;
        }
        
        .calendar-header h2 {
          font-size: clamp(1.3rem, 4vw, 2rem);
          color: #1e293b;
          font-weight: 800;
        }
        
        .calendar-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: clamp(4px, 1vw, 12px);
          margin-bottom: 30px;
        }
        
        .calendar-day-header {
          text-align: center;
          font-weight: 800;
          color: #3b82f6;
          padding: 8px;
          font-size: clamp(0.7rem, 2vw, 0.9rem);
          text-transform: uppercase;
        }
        
        .calendar-day {
          aspect-ratio: 1;
          border: 3px solid #e2e8f0;
          border-radius: 12px;
          padding: clamp(4px, 2vw, 12px);
          cursor: pointer;
          transition: all 0.3s;
          background: white;
          min-height: 80px;
        }
        
        .calendar-day:hover {
          border-color: #3b82f6;
          transform: translateY(-2px);
          box-shadow: 0 5px 15px rgba(59, 130, 246, 0.2);
        }
        
        .calendar-day.selected {
          background: linear-gradient(135deg, #3b82f6, #1e3a8a);
          color: white;
          border-color: transparent;
        }
        
        .calendar-day.today {
          border-color: #10b981;
          border-width: 4px;
        }
        
        .calendar-day.empty {
          background: #f8fafc;
          cursor: default;
          pointer-events: none;
        }
        
        .day-number {
          font-weight: 800;
          font-size: clamp(0.9rem, 3vw, 1.3rem);
          margin-bottom: 5px;
        }
        
        .day-events {
          font-size: clamp(0.65rem, 1.5vw, 0.75rem);
          display: flex;
          flex-direction: column;
          gap: 3px;
        }
        
        .day-event-dot {
          padding: 3px 6px;
          background: rgba(59, 130, 246, 0.15);
          border-radius: 4px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          font-weight: 600;
        }
        
        .selected .day-event-dot {
          background: rgba(255, 255, 255, 0.25);
        }
        
        .timeline-container {
          background: #f8fafc;
          border-radius: 16px;
          padding: clamp(15px, 3vw, 25px);
          margin-top: 25px;
        }
        
        .timeline-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          flex-wrap: wrap;
          gap: 10px;
        }
        
        .timeline-header h3 {
          font-size: clamp(1.1rem, 3vw, 1.5rem);
          color: #1e293b;
          font-weight: 800;
        }
        
        .timeline-item {
          display: flex;
          gap: 15px;
          margin-bottom: 15px;
          flex-wrap: wrap;
        }
        
        .timeline-time {
          min-width: 70px;
          font-weight: 800;
          color: #3b82f6;
          font-size: clamp(0.9rem, 2vw, 1.1rem);
        }
        
        .timeline-content {
          flex: 1;
          background: white;
          padding: 15px;
          border-radius: 12px;
          border-left: 5px solid #3b82f6;
          box-shadow: 0 4px 15px rgba(0,0,0,0.08);
          min-width: 200px;
        }
        
        .timeline-content.work { border-left-color: #3b82f6; }
        .timeline-content.break { border-left-color: #f59e0b; }
        .timeline-content.lunch { border-left-color: #10b981; }
        .timeline-content.meeting { border-left-color: #8b5cf6; }
        
        .timeline-title {
          font-weight: 800;
          font-size: clamp(0.95rem, 2.5vw, 1.1rem);
          color: #1e293b;
          margin-bottom: 8px;
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }
        
        .timeline-meta {
          color: #64748b;
          font-size: clamp(0.8rem, 2vw, 0.9rem);
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }
        
        .activity-type-badge {
          display: inline-block;
          padding: 4px 10px;
          border-radius: 20px;
          font-size: clamp(0.7rem, 1.8vw, 0.75rem);
          font-weight: 700;
          text-transform: uppercase;
        }
        
        .activity-type-badge.work {
          background: rgba(59, 130, 246, 0.15);
          color: #1e3a8a;
        }
        
        .activity-type-badge.break {
          background: rgba(245, 158, 11, 0.15);
          color: #92400e;
        }
        
        .activity-type-badge.lunch {
          background: rgba(16, 185, 129, 0.15);
          color: #065f46;
        }
        
        .activity-type-badge.meeting {
          background: rgba(139, 92, 246, 0.15);
          color: #5b21b6;
        }
        
        .timer-container {
          background: linear-gradient(135deg, #1e3a8a, #3b82f6);
          padding: clamp(20px, 4vw, 40px);
          border-radius: 20px;
          color: white;
          margin-bottom: 30px;
        }
        
        .timer-display {
          font-size: clamp(2.5rem, 10vw, 5rem);
          font-weight: 900;
          text-align: center;
          margin: 30px 0;
          font-variant-numeric: tabular-nums;
        }
        
        .timer-controls {
          display: flex;
          gap: 15px;
          justify-content: center;
          flex-wrap: wrap;
          margin-top: 25px;
        }
        
        .timer-settings {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 15px;
          margin-bottom: 25px;
        }
        
        .modal {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.6);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
          backdrop-filter: blur(5px);
        }
        
        .modal-content {
          background: white;
          padding: clamp(20px, 4vw, 35px);
          border-radius: 20px;
          max-width: 550px;
          width: 100%;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 25px 80px rgba(0,0,0,0.3);
        }
        
        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 25px;
        }
        
        .modal-header h2 {
          font-size: clamp(1.3rem, 4vw, 1.8rem);
          color: #1e293b;
          font-weight: 800;
        }
        
        .form-group {
          margin-bottom: 20px;
        }
        
        .form-group label {
          display: block;
          margin-bottom: 8px;
          font-weight: 700;
          color: #475569;
          font-size: clamp(0.8rem, 2vw, 0.9rem);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .form-group input,
        .form-group textarea,
        .form-group select {
          width: 100%;
          padding: 12px;
          border: 2px solid #e2e8f0;
          border-radius: 12px;
          font-size: clamp(0.9rem, 2vw, 1rem);
          transition: all 0.2s;
          font-family: inherit;
        }
        
        .form-group input:focus,
        .form-group textarea:focus,
        .form-group select:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
        }
        
        .form-group textarea {
          resize: vertical;
          min-height: 100px;
        }
        
        .notification {
          position: fixed;
          top: 25px;
          right: 25px;
          background: white;
          padding: 16px 22px;
          border-radius: 12px;
          box-shadow: 0 15px 50px rgba(0,0,0,0.25);
          z-index: 2000;
          animation: slideIn 0.4s;
          font-weight: 600;
          max-width: 90vw;
          word-wrap: break-word;
        }
        
        .notification.success {
          border-left: 5px solid #10b981;
        }
        
        .notification.warning {
          border-left: 5px solid #f59e0b;
        }
        
        .notification.alarm {
          border-left: 5px solid #ef4444;
          background: #fee2e2;
          color: #991b1b;
          font-size: 1.1rem;
        }
        
        .notification.fade-out {
          animation: slideOut 0.4s;
        }
        
        @keyframes slideIn {
          from { transform: translateX(450px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        
        @keyframes slideOut {
          from { transform: translateX(0); opacity: 1; }
          to { transform: translateX(450px); opacity: 0; }
        }
        
        .empty-state {
          text-align: center;
          padding: clamp(40px, 8vw, 80px) 20px;
          color: #94a3b8;
        }
        
        .empty-state svg {
          width: clamp(60px, 15vw, 100px);
          height: clamp(60px, 15vw, 100px);
          margin-bottom: 20px;
          opacity: 0.3;
        }
        
        .empty-state h3 {
          font-size: clamp(1.1rem, 3vw, 1.5rem);
          margin-bottom: 10px;
          color: #64748b;
        }
        
        .reminder-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        
        .reminder-item {
          padding: 15px;
          background: #f8fafc;
          border-radius: 12px;
          border-left: 4px solid #ef4444;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }
        
        .session-stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 15px;
          margin: 25px 0;
        }
        
        .session-stat-card {
          background: rgba(255,255,255,0.2);
          padding: 20px;
          border-radius: 12px;
          text-align: center;
        }
        
        .session-stat-value {
          font-size: clamp(1.5rem, 4vw, 2rem);
          font-weight: 900;
          margin-bottom: 5px;
        }
        
        .session-stat-label {
          font-size: clamp(0.75rem, 2vw, 0.85rem);
          opacity: 0.9;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .task-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        
        .task-item {
          padding: 15px;
          background: #f8fafc;
          border-radius: 12px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
          border-left: 4px solid #3b82f6;
        }
        
        .task-item.completed {
          opacity: 0.6;
          border-left-color: #10b981;
          text-decoration: line-through;
        }
        
        .task-content {
          flex: 1;
        }
        
        .task-title {
          font-weight: 800;
          font-size: 1.1rem;
          margin-bottom: 5px;
        }
        
        .task-meta {
          font-size: 0.9rem;
          color: #64748b;
        }
        
        .task-actions {
          display: flex;
          gap: 8px;
        }
        
        @media (max-width: 768px) {
          .app { padding: 10px; }
          .calendar-day { min-height: 60px; }
          .timer-display { margin: 20px 0; }
          .btn { padding: 10px 16px; }
          .week-view {
            grid-template-columns: 1fr !important;
          }
        }
        
        /* MODE SOMBRE */
        .app.dark {
          color: #f1f5f9;
        }

        .dark .header {
          background: #1e293b;
          box-shadow: 0 20px 60px rgba(0,0,0,0.5);
        }

        .dark .nav-tabs {
          background: #1e293b;
          box-shadow: 0 10px 40px rgba(0,0,0,0.5);
        }

        .dark .nav-tab {
          color: #94a3b8;
        }

        .dark .nav-tab:hover {
          background: #334155;
        }

        .dark .nav-tab.active {
          background: linear-gradient(135deg, #60a5fa, #3b82f6);
        }

        .dark .content {
          background: #1e293b;
          box-shadow: 0 20px 60px rgba(0,0,0,0.5);
        }

        .dark .calendar-header h2,
        .dark .timeline-header h3 {
          color: #f1f5f9;
        }

        .dark .calendar-day {
          background: #334155;
          border-color: #475569;
        }

        .dark .calendar-day.empty {
          background: #1e293b;
        }

        .dark .timeline-container {
          background: #334155;
        }

        .dark .timeline-content {
          background: #1e293b;
        }

        .dark .timeline-title {
          color: #f1f5f9;
        }

        .dark .timeline-meta {
          color: #94a3b8;
        }

        .dark .notification {
          background: #1e293b;
          color: #f1f5f9;
        }

        .dark .task-item {
          background: #334155;
        }

        .dark .task-meta {
          color: #94a3b8;
        }

        .dark .reminder-item {
          background: #334155;
        }

        .dark .stat-card {
          background: linear-gradient(135deg, #60a5fa, #3b82f6);
        }

        .dark .btn-secondary {
          background: #334155;
          color: #f1f5f9;
          border-color: #475569;
        }

        .dark .btn-secondary:hover {
          background: #475569;
        }

        .dark .form-group label {
          color: #94a3b8;
        }

        .dark .form-group input,
        .dark .form-group textarea,
        .dark .form-group select {
          background: #334155;
          border-color: #475569;
          color: #f1f5f9;
        }

        .dark .modal-content {
          background: #1e293b;
        }

        .dark .modal-header h2 {
          color: #f1f5f9;
        }

        .dark .calendar-day-header {
          color: #60a5fa;
        }

        .dark .timeline-time {
          color: #60a5fa;
        }

        .dark .empty-state h3 {
          color: #94a3b8;
        }

        .dark .task-title {
          color: #f1f5f9;
        }
      `}</style>
      
      {/* HEADER */}
      <div className="header">
        <h1>📊 Manager Pro</h1>
        <div style={{fontSize: '0.9rem', color: '#64748b'}}>
          💾 Gestion de tout mes activites
        </div>
        <div className="header-actions" style={{display: 'flex', gap: '10px', marginTop: '15px', flexWrap: 'wrap'}}>
          <button 
            style={{
              padding: '10px',
              border: 'none',
              borderRadius: '12px',
              background: darkMode ? '#334155' : '#f1f5f9',
              color: darkMode ? '#f1f5f9' : '#475569',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              fontWeight: '700'
            }}
            onClick={() => setDarkMode(!darkMode)}
          >
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            <span>{darkMode ? 'Mode Clair' : 'Mode Sombre'}</span>
          </button>
          
          <button className="btn btn-secondary btn-small" onClick={exportAllData}>
            <Download size={16} />
            Exporter
          </button>
          
          <label className="btn btn-secondary btn-small" style={{cursor: 'pointer', margin: 0}}>
            <Upload size={16} />
            Importer
            <input type="file" accept=".json" onChange={importData} style={{display: 'none'}} />
          </label>
          
          {/* BOUTON TEST SAUVEGARDE */}
          <button 
            className="btn btn-primary btn-small"
            onClick={async () => {
              const testProject = { id: Date.now(), name: 'Projet Test', description: 'Test de persistance' };
              setProjects([testProject]);
              
              setTimeout(() => {
                const saved = localStorage.getItem('projects');
                if (saved) {
                  console.log('✅ TEST RÉUSSI - Données sauvegardées:', JSON.parse(saved));
                  showNotification('✅ La sauvegarde fonctionne !');
                } else {
                  console.error('❌ TEST ÉCHOUÉ - Rien n\'est sauvegardé');
                  showNotification('❌ Erreur de sauvegarde', 'warning');
                }
              }, 1000);
            }}
          >
            🧪 Tester
          </button>
          
          {/* BOUTON DEBUG */}
          <button 
            className="btn btn-secondary btn-small"
            onClick={() => {
              console.log('📊 État actuel:');
              console.log('Activities:', activities.length);
              console.log('Projects:', projects.length);
              console.log('Tasks:', tasks.length);
              console.log('Clients:', clients.length);
              console.log('Notes:', notes.length);
              console.log('Reminders:', reminders.length);
              console.log('Sessions:', sessions.length);
              console.log('---');
              console.log('📦 localStorage:');
              console.log('projects:', localStorage.getItem('projects'));
            }}
          >
            🔍 Debug
          </button>
          
          {/* BOUTON RESET */}
          <button 
            className="btn btn-danger btn-small"
            onClick={async () => {
              if (window.confirm('⚠️ Effacer TOUTES les données ?')) {
                CloudStorage.clear();
                window.location.reload();
              }
            }}
          >
            🗑️ Reset
          </button>
        </div>  
      </div>
      
      {/* NAVIGATION */}
      <div className="nav-tabs">
        <button 
          className={`nav-tab ${currentView === 'calendar' ? 'active' : ''}`}
          onClick={() => setCurrentView('calendar')}
        >
          <Calendar size={18} />
          <span>Calendrier</span>
        </button>
        <button 
          className={`nav-tab ${currentView === 'tasks' ? 'active' : ''}`}
          onClick={() => setCurrentView('tasks')}
        >
          <Check size={18} />
          <span>Tâches</span>
        </button>
        <button 
          className={`nav-tab ${currentView === 'chrono' ? 'active' : ''}`}
          onClick={() => setCurrentView('chrono')}
        >
          <Clock size={18} />
          <span>Chronomètre</span>
        </button>
        <button 
          className={`nav-tab ${currentView === 'projects' ? 'active' : ''}`}
          onClick={() => setCurrentView('projects')}
        >
          <Briefcase size={18} />
          <span>Projets</span>
        </button>
        <button 
          className={`nav-tab ${currentView === 'clients' ? 'active' : ''}`}
          onClick={() => setCurrentView('clients')}
        >
          <Users size={18} />
          <span>Clients</span>
        </button>
        <button 
          className={`nav-tab ${currentView === 'reminders' ? 'active' : ''}`}
          onClick={() => setCurrentView('reminders')}
        >
          <Bell size={18} />
          <span>Rappels</span>
        </button>
        <button 
          className={`nav-tab ${currentView === 'notes' ? 'active' : ''}`}
          onClick={() => setCurrentView('notes')}
        >
          <FileText size={18} />
          <span>Notes</span>
        </button>
        <button 
          className={`nav-tab ${currentView === 'stats' ? 'active' : ''}`}
          onClick={() => setCurrentView('stats')}
        >
          <BarChart3 size={18} />
          <span>Stats</span>
        </button>
      </div>{/* CONTENU */}
      <div className="content">
        <div style={{
              display: 'flex',
              gap: '10px',
              marginBottom: '20px',
              flexWrap: 'wrap',
              alignItems: 'center'
            }}>
          <div style={{flex: '1', minWidth: '200px', position: 'relative'}}>
            <Search 
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#94a3b8'
              }} 
              size={18} 
            />
            <input
              type="text"
              placeholder="Rechercher une activité..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 12px 12px 40px',
                border: `2px solid ${darkMode ? '#475569' : '#e2e8f0'}`,
                borderRadius: '12px',
                fontSize: '0.95rem',
                background: darkMode ? '#334155' : 'white',
                color: darkMode ? '#f1f5f9' : '#1e293b'
              }}
            />
          </div>
          
          <select
            value={filterProject}
            onChange={(e) => setFilterProject(e.target.value)}
            style={{
              padding: '12px',
              borderRadius: '12px',
              border: `2px solid ${darkMode ? '#475569' : '#e2e8f0'}`,
              background: darkMode ? '#334155' : 'white',
              color: darkMode ? '#f1f5f9' : '#1e293b',
              fontWeight: '600'
            }}
          >
            <option value="">Tous les projets</option>
            {projects.map(proj => (
              <option key={proj.id} value={proj.name}>{proj.name}</option>
            ))}
          </select>
          
          {(searchQuery || filterProject) && (
            <button
              className="btn btn-secondary btn-small"
              onClick={() => {
                setSearchQuery('');
                setFilterProject('');
              }}
            >
              <X size={16} />
              Effacer filtres
            </button>
          )}
        </div>
        
        {/* VUE CALENDRIER */}
        {currentView === 'calendar' && (
          <div>
            <div className="calendar-header">
              <h2>
                {currentMonth.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
              </h2>
              <div style={{display: 'flex', gap: '8px', background: darkMode ? '#334155' : '#f1f5f9', padding: '4px', borderRadius: '12px'}}>
                <button 
                  style={{
                    padding: '8px 16px',
                    border: 'none',
                    borderRadius: '8px',
                    background: viewMode === 'month' ? (darkMode ? '#1e293b' : 'white') : 'transparent',
                    color: viewMode === 'month' ? (darkMode ? '#60a5fa' : '#3b82f6') : (darkMode ? '#94a3b8' : '#64748b'),
                    cursor: 'pointer',
                    fontWeight: '600',
                    boxShadow: viewMode === 'month' ? '0 2px 8px rgba(0,0,0,0.1)' : 'none'
                  }}
                  onClick={() => setViewMode('month')}
                >
                  Mois
                </button>
                <button 
                  style={{
                    padding: '8px 16px',
                    border: 'none',
                    borderRadius: '8px',
                    background: viewMode === 'week' ? (darkMode ? '#1e293b' : 'white') : 'transparent',
                    color: viewMode === 'week' ? (darkMode ? '#60a5fa' : '#3b82f6') : (darkMode ? '#94a3b8' : '#64748b'),
                    cursor: 'pointer',
                    fontWeight: '600',
                    boxShadow: viewMode === 'week' ? '0 2px 8px rgba(0,0,0,0.1)' : 'none'
                  }}
                  onClick={() => setViewMode('week')}
                >
                  Semaine
                </button>
              </div>
              <div style={{display: 'flex', gap: '10px', flexWrap: 'wrap'}}>
                <button 
                  className="btn btn-secondary btn-small"
                  onClick={() => {
                    const newMonth = new Date(currentMonth);
                    newMonth.setMonth(newMonth.getMonth() - 1);
                    setCurrentMonth(newMonth);
                  }}
                >
                  <ChevronLeft size={16} />
                </button>
                <button 
                  className="btn btn-secondary btn-small"
                  onClick={() => setCurrentMonth(new Date())}
                >
                  Aujourd'hui
                </button>
                <button 
                  className="btn btn-secondary btn-small"
                  onClick={() => {
                    const newMonth = new Date(currentMonth);
                    newMonth.setMonth(newMonth.getMonth() + 1);
                    setCurrentMonth(newMonth);
                  }}
                >
                  <ChevronRight size={16} />
                </button>
                <button 
                  className="btn btn-primary btn-small"
                  onClick={exportToPDF}
                >
                  <Download size={16} />
                  PDF
                </button>
              </div>
            </div>
            
            {viewMode === 'month' ? (
              <div className="calendar-grid">
                {['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'].map(day => (
                  <div key={day} className="calendar-day-header">{day}</div>
                ))}
                
                {getDaysInMonth(currentMonth).map((day, index) => {
                  const isToday = day && day.toDateString() === new Date().toDateString();
                  const isSelected = day && selectedDate && day.toDateString() === selectedDate.toDateString();
                  const dayActivities = day ? getActivitiesForDate(day) : [];
                  
                  return (
                    <div
                      key={index}
                      className={`calendar-day ${!day ? 'empty' : ''} ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''}`}
                      onClick={() => day && setSelectedDate(day)}
                    >
                      {day && (
                        <>
                          <div className="day-number">{day.getDate()}</div>
                          <div className="day-events">
                            {dayActivities.slice(0, 2).map(activity => (
                              <div key={activity.id} className="day-event-dot">
                                {activity.startTime} {activity.title}
                              </div>
                            ))}
                            {dayActivities.length > 2 && (
                              <div className="day-event-dot">+{dayActivities.length - 2}</div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(7, 1fr)',
                gap: '19px',
                marginBottom: '30px'
              }}>
                {getWeekDays(selectedDate).map((day, index) => {
                  const isToday = day.toDateString() === new Date().toDateString();
                  const dayActivities = getActivitiesForDate(day);
                  
                  return (
                    <div key={index} style={{
                      background: darkMode ? '#334155' : '#f8fafc',
                      padding: '15px',
                      borderRadius: '12px',
                      minHeight: '300px',
                      border: isToday ? '3px solid #10b981' : 'none'
                    }}>
                      <div style={{
                        fontWeight: '800',
                        fontSize: '1.1rem',
                        marginBottom: '10px',
                        color: darkMode ? '#60a5fa' : '#3b82f6'
                      }}>
                        {day.toLocaleDateString('fr-FR', { weekday: 'long' })}
                      </div>
                      <div style={{
                        fontSize: '0.85rem',
                        color: darkMode ? '#94a3b8' : '#64748b',
                        marginBottom: '15px'
                      }}>
                        {day.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                      </div>
                      <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
                        {dayActivities.length === 0 ? (
                          <div style={{
                            color: '#94a3b8',
                            fontSize: '0.85rem',
                            textAlign: 'center',
                            padding: '20px'
                          }}>
                            Aucune activité
                          </div>
                        ) : (
                          dayActivities.map(activity => (
                            <div key={activity.id} style={{
                              padding: '10px',
                              background: darkMode ? '#1e293b' : 'white',
                              borderRadius: '8px',
                              fontSize: '0.85rem',
                              borderLeft: `4px solid ${
                                activity.type === 'work' ? '#3b82f6' :
                                activity.type === 'meeting' ? '#8b5cf6' :
                                activity.type === 'break' ? '#f59e0b' : '#10b981'
                              }`
                            }}>
                              <div style={{fontWeight: '700', marginBottom: '4px'}}>
                                {activity.startTime} - {activity.endTime}
                              </div>
                              <div>{activity.title}</div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            
            {selectedDate && (
              <div>
                <div className="stats-grid">
                  <div className="stat-card">
                    <div className="stat-value">{dayStats.workHours}h</div>
                    <div className="stat-label">Travail</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value">{dayStats.breakHours}h</div>
                    <div className="stat-label">Repos</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value">{dayStats.meetingHours}h</div>
                    <div className="stat-label">Réunions</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value">{dayStats.productivity}%</div>
                    <div className="stat-label">Productivité</div>
                  </div>
                </div>
                
                <div className="timeline-container">
                  <div className="timeline-header">
                    <h3>
                      📅 {selectedDate.toLocaleDateString('fr-FR', { 
                        weekday: 'long', 
                        day: 'numeric', 
                        month: 'long'
                      })}
                    </h3>
                    <button 
                      className="btn btn-primary btn-small"
                      onClick={() => setShowActivityModal(true)}
                    >
                      <Plus size={16} />
                      Activité
                    </button>
                  </div>
                  
                  {getActivitiesForDate(selectedDate).length === 0 ? (
                    <div className="empty-state">
                      <Clock size={80} />
                      <h3>Aucune activité</h3>
                    </div>
                  ) : (
                    getActivitiesForDate(selectedDate).map(activity => (
                      <div key={activity.id} className="timeline-item">
                        <div className="timeline-time">
                          {activity.startTime}<br/>
                          <span style={{fontSize: '0.75rem', color: '#94a3b8'}}>
                            {activity.endTime}
                          </span>
                        </div>
                        <div className={`timeline-content ${activity.type}`}>
                          <div className="timeline-title">
                            {activity.type === 'work' && <Briefcase size={18} />}
                            {activity.type === 'break' && <Coffee size={18} />}
                            {activity.type === 'lunch' && <Coffee size={18} />}
                            {activity.type === 'meeting' && <Users size={18} />}
                            {activity.title}
                            <span className={`activity-type-badge ${activity.type}`}>
                              {activity.type === 'work' && 'Travail'}
                              {activity.type === 'break' && 'Pause'}
                              {activity.type === 'lunch' && 'Déjeuner'}
                              {activity.type === 'meeting' && 'Réunion'}
                            </span>
                          </div>
                          <div className="timeline-meta">
                            <span>⏱️ {calculateDuration(activity.startTime, activity.endTime)} min</span>
                            {activity.client && <span>👤 {activity.client}</span>}
                            {activity.project && <span>📁 {activity.project}</span>}
                          </div>
                          {activity.description && (
                            <div style={{marginTop: 10, color: '#475569', lineHeight: 1.6}}>
                              {activity.description}
                            </div>
                          )}
                          <div style={{marginTop: 12}}>
                            <button 
                              className="btn btn-danger btn-small"
                              onClick={() => deleteActivity(activity.id)}
                            >
                              <Trash2 size={14} />
                              Supprimer
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* VUE TÂCHES */}
        {currentView === 'tasks' && (
          <>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25, flexWrap: 'wrap', gap: 15}}>
              <h2 style={{fontSize: 'clamp(1.5rem, 4vw, 2rem)', fontWeight: 800}}>✅ Tâches</h2>
              <button className="btn btn-primary" onClick={() => setShowTaskModal(true)}>
                <Plus size={18} />
                Nouvelle tâche
              </button>
            </div>
            
            <div className="stats-grid" style={{marginBottom: 30}}>
              <div className="stat-card">
                <div className="stat-value">{tasks.filter(t => !t.completed).length}</div>
                <div className="stat-label">En cours</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{tasks.filter(t => t.completed).length}</div>
                <div className="stat-label">Terminées</div>
              </div>
            </div>
            
            {tasks.length === 0 ? (
              <div className="empty-state">
                <Check size={100} />
                <h3>Aucune tâche</h3>
              </div>
            ) : (
              <div className="task-list">
                {tasks.map(task => (
                  <div key={task.id} className={`task-item ${task.completed ? 'completed' : ''}`}>
                    <div className="task-content">
                      <div className="task-title">{task.title}</div>
                      <div className="task-meta">
                        {task.project && `📁 ${task.project}`}
                        {task.description && ` • ${task.description}`}
                      </div>
                    </div>
                    <div className="task-actions">
                      <button 
                        className={`btn btn-small ${task.completed ? 'btn-secondary' : 'btn-success'}`}
                        onClick={() => toggleTask(task.id)}
                      >
                        <Check size={14} />
                        {task.completed ? 'Annuler' : 'Terminer'}
                      </button>
                      <button 
                        className="btn btn-danger btn-small"
                        onClick={() => deleteTask(task.id)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}{/* VUE CHRONOMÈTRE */}
        {currentView === 'chrono' && (
          <div>
            <h2 style={{marginBottom: 25, fontSize: 'clamp(1.5rem, 4vw, 2rem)', fontWeight: 800}}>
              ⏱️ Chronomètre de Travail
            </h2>
            
            <div className="timer-container">
              <div className="timer-settings">
                <div className="form-group" style={{marginBottom: 0}}>
                  <label style={{color: 'white'}}>Projet *</label>
                  <select 
                    value={selectedProject}
                    onChange={(e) => setSelectedProject(e.target.value)}
                    style={{background: 'white'}}
                  >
                    <option value="">Sélectionner un projet</option>
                    {projects.map(p => (
                      <option key={p.id} value={p.name}>{p.name}</option>
                    ))}
                  </select>
                </div>
                
                <div className="form-group" style={{marginBottom: 0}}>
                  <label style={{color: 'white'}}>Durée travail (min)</label>
                  <input 
                    type="number"
                    value={workMinutes}
                    onChange={(e) => setWorkMinutes(Number(e.target.value))}
                    min="1"
                    max="120"
                  />
                </div>
                
                <div className="form-group" style={{marginBottom: 0}}>
                  <label style={{color: 'white'}}>Durée pause (min)</label>
                  <input 
                    type="number"
                    value={breakMinutes}
                    onChange={(e) => setBreakMinutes(Number(e.target.value))}
                    min="1"
                    max="30"
                  />
                </div>
              </div>
              
              <div className="timer-display">
                {Math.floor(timerSeconds / 3600).toString().padStart(2, '0')}:
                {Math.floor((timerSeconds % 3600) / 60).toString().padStart(2, '0')}:
                {(timerSeconds % 60).toString().padStart(2, '0')}
              </div>
              
              <div style={{textAlign: 'center', fontSize: 'clamp(1rem, 3vw, 1.3rem)', marginBottom: 20, fontWeight: 700}}>
                {timerMode === 'work' ? '💼 Mode Travail' : '☕ Mode Pause'}
              </div>
              
              <div className="timer-controls">
                <button 
                  className="btn btn-success"
                  onClick={startTimer}
                  disabled={timerRunning}
                >
                  <Play size={20} />
                  Démarrer
                </button>
                
                <button 
                  className="btn btn-warning"
                  onClick={pauseTimer}
                  disabled={!timerRunning}
                >
                  <Pause size={20} />
                  Pause
                </button>
                
                <button 
                  className="btn btn-danger"
                  onClick={resetTimer}
                >
                  <RotateCcw size={20} />
                  Réinitialiser
                </button>
              </div>
              
              <div className="session-stats">
                <div className="session-stat-card">
                  <div className="session-stat-value">{sessions.filter(s => s.date.startsWith(new Date().toISOString().split('T')[0])).length}</div>
                  <div className="session-stat-label">Sessions Aujourd'hui</div>
                </div>
                
                <div className="session-stat-card">
                  <div className="session-stat-value">{todayWorkMinutes}</div>
                  <div className="session-stat-label">Minutes de Travail</div>
                </div>
                
                <div className="session-stat-card" style={{gridColumn: 'span 2'}}>
                  <div style={{display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap'}}>
                    <button className="btn btn-secondary" onClick={exportToPDF}>
                      <Download size={18} />
                      PDF
                    </button>
                    <button className="btn btn-secondary" onClick={exportToExcel}>
                      <Download size={18} />
                      Excel
                    </button>
                  </div>
                </div>
              </div>
            </div>
            
            {/* HISTORIQUE DES SESSIONS */}
            <div style={{marginTop: 30}}>
              <h3 style={{marginBottom: 20, fontSize: 'clamp(1.2rem, 3vw, 1.5rem)', fontWeight: 800}}>
                📊 Historique des Sessions
              </h3>
              
              {sessions.filter(s => s.date.startsWith(new Date().toISOString().split('T')[0])).length === 0 ? (
                <div className="empty-state">
                  <TrendingUp size={80} />
                  <h3>Aucune session aujourd'hui</h3>
                </div>
              ) : (
                <div style={{display: 'flex', flexDirection: 'column', gap: 12}}>
                  {sessions
                    .filter(s => s.date.startsWith(new Date().toISOString().split('T')[0]))
                    .reverse()
                    .map(session => (
                      <div key={session.id} style={{
                        padding: 15,
                        background: darkMode ? '#334155' : '#f8fafc',
                        borderRadius: 12,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: 10,
                        flexWrap: 'wrap'
                      }}>
                        <div>
                          <div style={{fontWeight: 800, marginBottom: 5}}>{session.project}</div>
                          <div style={{fontSize: '0.9rem', color: '#64748b'}}>
                            ⏱️ {Math.floor(session.duration / 60)}min {session.duration % 60}s
                            {' • '}
                            {new Date(session.date).toLocaleTimeString('fr-FR')}
                          </div>
                        </div>
                        <span className={`activity-type-badge ${session.type}`}>
                          {session.type === 'work' ? 'Travail' : 'Pause'}
                        </span>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* VUE PROJETS */}
        {currentView === 'projects' && (
          <>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25, flexWrap: 'wrap', gap: 15}}>
              <h2 style={{fontSize: 'clamp(1.5rem, 4vw, 2rem)', fontWeight: 800}}>📁 Projets</h2>
              <button className="btn btn-primary" onClick={() => setShowProjectModal(true)}>
                <Plus size={18} />
                Nouveau projet
              </button>
            </div>
            
            {projects.length === 0 ? (
              <div className="empty-state">
                <Briefcase size={100} />
                <h3>Aucun projet</h3>
              </div>
            ) : (
              <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20}}>
                {projects.map(project => (
                  <div key={project.id} style={{
                    padding: 20,
                    background: darkMode ? '#334155' : 'white',
                    border: `3px solid ${darkMode ? '#475569' : '#e2e8f0'}`,
                    borderRadius: 16
                  }}>
                    <div style={{fontSize: '1.2rem', fontWeight: 800, color: darkMode ? '#f1f5f9' : '#1e293b', marginBottom: 10}}>
                      {project.name}
                    </div>
                    {project.description && (
                      <div style={{fontSize: '0.9rem', color: '#64748b', marginBottom: 15, lineHeight: 1.6}}>
                        {project.description}
                      </div>
                    )}
                    <button 
                      className="btn btn-danger btn-small"
                      onClick={() => deleteProject(project.id)}
                    >
                      <Trash2 size={14} />
                      Supprimer
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
        
        {/* VUE CLIENTS */}
        {currentView === 'clients' && (
          <>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25, flexWrap: 'wrap', gap: 15}}>
              <h2 style={{fontSize: 'clamp(1.5rem, 4vw, 2rem)', fontWeight: 800}}>👥 Clients</h2>
              <button className="btn btn-primary" onClick={() => setShowClientModal(true)}>
                <Plus size={18} />
                Nouveau client
              </button>
            </div>
            
            {clients.length === 0 ? (
              <div className="empty-state">
                <Users size={100} />
                <h3>Aucun client</h3>
              </div>
            ) : (
              <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20}}>
                {clients.map(client => (
                  <div key={client.id} style={{
                    padding: 20,
                    background: darkMode ? '#334155' : 'white',
                    border: `3px solid ${darkMode ? '#475569' : '#e2e8f0'}`,
                    borderRadius: 16
                  }}>
                    <div style={{fontSize: '1.2rem', fontWeight: 800, color: darkMode ? '#f1f5f9' : '#1e293b', marginBottom: 10}}>
                      {client.name}
                    </div>
                    <div style={{fontSize: '0.9rem', color: '#64748b', marginBottom: 5}}>
                      📧 {client.email}
                    </div>
                    <div style={{fontSize: '0.9rem', color: '#64748b', marginBottom: 5}}>
                      📱 {client.phone}
                    </div>
                    {client.company && (
                      <div style={{fontSize: '0.9rem', color: '#64748b', marginBottom: 15}}>
                        🏢 {client.company}
                      </div>
                    )}
                    <button 
                      className="btn btn-danger btn-small"
                      onClick={() => deleteClient(client.id)}
                    >
                      <Trash2 size={14} />
                      Supprimer
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}{/* VUE RAPPELS */}
        {currentView === 'reminders' && (
          <>
            {alarmPlaying && (
              <div style={{marginBottom: 20, textAlign: 'center'}}>
                <button className="btn btn-danger" onClick={stopAlarm}>
                  🔕 Arrêter l'alarme
                </button>
              </div>
            )}

            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25, flexWrap: 'wrap', gap: 15}}>
              <h2 style={{fontSize: 'clamp(1.5rem, 4vw, 2rem)', fontWeight: 800}}>🔔 Rappels & Alarmes</h2>
              <button className="btn btn-primary" onClick={() => setShowReminderModal(true)}>
                <Plus size={18} />
                Nouveau rappel
              </button>
            </div>
            
            {upcomingReminders.length === 0 ? (
              <div className="empty-state">
                <Bell size={100} />
                <h3>Aucun rappel</h3>
              </div>
            ) : (
              <div className="reminder-list">
                {upcomingReminders.map(reminder => (
                  <div key={reminder.id} className="reminder-item">
                    <div style={{flex: 1}}>
                      <div style={{fontWeight: 800, marginBottom: 5, fontSize: '1.1rem'}}>
                        {reminder.title}
                      </div>
                      <div style={{fontSize: '0.9rem', color: '#64748b'}}>
                        🔔 {new Date(reminder.datetime).toLocaleString('fr-FR')}
                      </div>
                      {reminder.description && (
                        <div style={{fontSize: '0.9rem', color: '#475569', marginTop: 5}}>
                          {reminder.description}
                        </div>
                      )}
                    </div>
                    <button 
                      className="btn btn-danger btn-small"
                      onClick={() => deleteReminder(reminder.id)}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
        
        {/* VUE NOTES */}
        {currentView === 'notes' && (
          <>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25, flexWrap: 'wrap', gap: 15}}>
              <h2 style={{fontSize: 'clamp(1.5rem, 4vw, 2rem)', fontWeight: 800}}>📝 Notes</h2>
              <button className="btn btn-primary" onClick={() => setShowNoteModal(true)}>
                <Plus size={18} />
                Nouvelle note
              </button>
            </div>
            
            {notes.length === 0 ? (
              <div className="empty-state">
                <FileText size={100} />
                <h3>Aucune note</h3>
              </div>
            ) : (
              <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20}}>
                {notes.map(note => (
                  <div key={note.id} style={{
                    padding: 20,
                    background: darkMode ? '#334155' : '#fffbeb',
                    borderRadius: 16,
                    border: `3px solid ${darkMode ? '#475569' : '#fbbf24'}`
                  }}>
                    <div style={{fontWeight: 800, color: darkMode ? '#fbbf24' : '#78350f', marginBottom: 10, fontSize: '1.2rem'}}>
                      {note.title}
                    </div>
                    <div style={{color: darkMode ? '#fde68a' : '#92400e', lineHeight: 1.6, marginBottom: 12}}>
                      {note.content}
                    </div>
                    <div style={{fontSize: '0.8rem', color: darkMode ? '#fcd34d' : '#a16207', marginBottom: 12}}>
                      {new Date(note.createdAt).toLocaleDateString('fr-FR')}
                    </div>
                    <button 
                      className="btn btn-danger btn-small"
                      onClick={() => deleteNote(note.id)}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
        
        {/* VUE STATISTIQUES */}
        {currentView === 'stats' && (
          <>
            <h2 style={{marginBottom: 30, fontSize: 'clamp(1.5rem, 4vw, 2rem)', fontWeight: 800}}>
              📈 Statistiques & Rapports
            </h2>
            
            {/* STATS HEBDOMADAIRES */}
            <div style={{marginBottom: 40}}>
              <h3 style={{marginBottom: 20, color: '#3b82f6', fontSize: '1.5rem'}}>
                📊 Résumé des 7 derniers jours
              </h3>
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-value">{weekStats.workHours}h</div>
                  <div className="stat-label">Heures de Travail</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value">{weekStats.breakHours}h</div>
                  <div className="stat-label">Temps de Repos</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value">{weekStats.meetingHours}h</div>
                  <div className="stat-label">Réunions</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value">{weekStats.avgPerDay}h</div>
                  <div className="stat-label">Moyenne par Jour</div>
                </div>
              </div>
            </div>
            
            {/* RÉPARTITION DU TEMPS */}
            <div style={{marginBottom: 40}}>
              <h3 style={{marginBottom: 20, color: '#3b82f6', fontSize: '1.5rem'}}>
                ⏱️ Répartition du temps (7 jours)
              </h3>
              {[
                {type: 'work', label: 'Travail', color: '#3b82f6', hours: weekStats.workHours},
                {type: 'break', label: 'Pauses', color: '#f59e0b', hours: weekStats.breakHours},
                {type: 'meeting', label: 'Réunions', color: '#8b5cf6', hours: weekStats.meetingHours}
              ].map(item => {
                const total = parseFloat(weekStats.workHours) + parseFloat(weekStats.breakHours) + parseFloat(weekStats.meetingHours);
                const percentage = total > 0 ? ((parseFloat(item.hours) / total) * 100).toFixed(0) : 0;
                
                return (
                  <div key={item.type} style={{marginBottom: 20}}>
                    <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: 8}}>
                      <strong style={{fontSize: '1.1rem'}}>{item.label}</strong>
                      <span style={{fontSize: '1.1rem', color: '#64748b'}}>
                        {item.hours}h ({percentage}%)
                      </span>
                    </div>
                    <div style={{height: '15px', background: darkMode ? '#475569' : '#e2e8f0', borderRadius: '10px', overflow: 'hidden'}}>
                      <div style={{
                        height: '100%',
                        background: item.color,
                        width: `${percentage}%`,
                        transition: 'width 0.5s ease'
                      }} />
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* TÂCHES COMPLÉTÉES */}
            <div>
              <h3 style={{marginBottom: 20, color: '#3b82f6', fontSize: '1.5rem'}}>
                ✅ Tâches Complétées
              </h3>
              <div style={{background: darkMode ? '#334155' : '#f8fafc', padding: '25px', borderRadius: '16px'}}>
                <div style={{fontSize: '3rem', fontWeight: '900', color: '#10b981', marginBottom: '10px'}}>
                  {tasks.filter(t => t.completed).length}
                </div>
                <div style={{color: '#64748b', fontSize: '1.1rem'}}>
                  tâches terminées sur {tasks.length} au total
                </div>
              </div>
            </div>
          </>
        )}
      </div>
      
      {/* ============================================ */}
      {/* MODALS */}
      {/* ============================================ */}
      
      {/* MODAL ACTIVITÉ */}
      {showActivityModal && (
        <div className="modal" onClick={() => setShowActivityModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Nouvelle Activité</h2>
              <button className="btn btn-secondary btn-small" onClick={() => setShowActivityModal(false)}>
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target);
              addActivity({
                title: formData.get('title'),
                startTime: formData.get('startTime'),
                endTime: formData.get('endTime'),
                type: formData.get('type'),
                client: formData.get('client'),
                project: formData.get('project'),
                task: formData.get('task'),
                description: formData.get('description')
              });
              e.target.reset();
            }}>
              <div className="form-group">
                <label>Titre *</label>
                <input type="text" name="title" required placeholder="Ex: Développement feature X" />
              </div>
              
              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15}}>
                <div className="form-group">
                  <label>Heure début *</label>
                  <input type="time" name="startTime" required />
                </div>
                
                <div className="form-group">
                  <label>Heure fin *</label>
                  <input type="time" name="endTime" required />
                </div>
              </div>
              
              <div className="form-group">
                <label>Type *</label>
                <select name="type" required>
                  <option value="work">💼 Travail</option>
                  <option value="meeting">👥 Réunion</option>
                  <option value="break">☕ Pause</option>
                  <option value="lunch">🍽️ Déjeuner</option>
                </select>
              </div>
              
              <div className="form-group">
                <label>Projet</label>
                <select name="project">
                  <option value="">Aucun</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.name}>{p.name}</option>
                  ))}
                </select>
              </div>
              
              <div className="form-group">
                <label>Tâche</label>
                <select name="task">
                  <option value="">Aucune</option>
                  {tasks.map(t => (
                    <option key={t.id} value={t.title}>{t.title}</option>
                  ))}
                </select>
              </div>
              
              <div className="form-group">
                <label>Client</label>
                <select name="client">
                  <option value="">Aucun</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>
              
              <div className="form-group">
                <label>Description</label>
                <textarea name="description" placeholder="Détails..." />
              </div>
              
              <button type="submit" className="btn btn-primary" style={{width: '100%'}}>
                Ajouter l'activité
              </button>
            </form>
          </div>
        </div>
      )}
      
      {/* MODAL PROJET */}
      {showProjectModal && (
        <div className="modal" onClick={() => setShowProjectModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Nouveau Projet</h2>
              <button className="btn btn-secondary btn-small" onClick={() => setShowProjectModal(false)}>
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target);
              addProject({
                name: formData.get('name'),
                description: formData.get('description')
              });
              e.target.reset();
            }}>
              <div className="form-group">
                <label>Nom du projet *</label>
                <input type="text" name="name" required />
              </div>
              
              <div className="form-group">
                <label>Description</label>
                <textarea name="description" />
              </div>
              
              <button type="submit" className="btn btn-primary" style={{width: '100%'}}>
                Créer le projet
              </button>
            </form>
          </div>
        </div>
      )}
      
      {/* MODAL CLIENT */}
      {showClientModal && (
        <div className="modal" onClick={() => setShowClientModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Nouveau Client</h2>
              <button className="btn btn-secondary btn-small" onClick={() => setShowClientModal(false)}>
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target);
              addClient({
                name: formData.get('name'),
                email: formData.get('email'),
                phone: formData.get('phone'),
                company: formData.get('company')
              });
              e.target.reset();
            }}>
              <div className="form-group">
                <label>Nom *</label>
                <input type="text" name="name" required />
              </div>
              
              <div className="form-group">
                <label>Email *</label>
                <input type="email" name="email" required />
              </div>
              
              <div className="form-group">
                <label>Téléphone</label>
                <input type="tel" name="phone" />
              </div>
              
              <div className="form-group">
                <label>Entreprise</label>
                <input type="text" name="company" />
              </div>
              
              <button type="submit" className="btn btn-primary" style={{width: '100%'}}>
                Ajouter le client
              </button>
            </form>
          </div>
        </div>
      )}
      
      {/* MODAL RAPPEL */}
      {showReminderModal && (
        <div className="modal" onClick={() => setShowReminderModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Nouveau Rappel</h2>
              <button className="btn btn-secondary btn-small" onClick={() => setShowReminderModal(false)}>
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target);
              addReminder({
                title: formData.get('title'),
                datetime: formData.get('datetime'),
                description: formData.get('description')
              });
              e.target.reset();
            }}>
              <div className="form-group">
                <label>Titre *</label>
                <input type="text" name="title" required placeholder="Ex: Appel client important" />
              </div>
              
              <div className="form-group">
                <label>Date et heure *</label>
                <input type="datetime-local" name="datetime" required />
              </div>
              
              <div className="form-group">
                <label>Description</label>
                <textarea name="description" placeholder="Détails du rappel..." />
              </div>
              
              <button type="submit" className="btn btn-primary" style={{width: '100%'}}>
                Créer le rappel
              </button>
            </form>
          </div>
        </div>
      )}
      
      {/* MODAL NOTE */}
      {showNoteModal && (
        <div className="modal" onClick={() => setShowNoteModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Nouvelle Note</h2>
              <button className="btn btn-secondary btn-small" onClick={() => setShowNoteModal(false)}>
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target);
              addNote({
                title: formData.get('title'),
                content: formData.get('content')
              });
              e.target.reset();
            }}>
              <div className="form-group">
                <label>Titre *</label>
                <input type="text" name="title" required />
              </div>
              
              <div className="form-group">
                <label>Contenu *</label>
                <textarea name="content" required style={{minHeight: 150}} />
              </div>
              
              <button type="submit" className="btn btn-primary" style={{width: '100%'}}>
                Créer la note
              </button>
            </form>
          </div>
        </div>
      )}
      
      {/* MODAL TÂCHE */}
      {showTaskModal && (
        <div className="modal" onClick={() => setShowTaskModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Nouvelle Tâche</h2>
              <button className="btn btn-secondary btn-small" onClick={() => setShowTaskModal(false)}>
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target);
              addTask({
                title: formData.get('title'),
                description: formData.get('description'),
                project: formData.get('project')
              });
              e.target.reset();
            }}>
              <div className="form-group">
                <label>Titre *</label>
                <input type="text" name="title" required />
              </div>
              
              <div className="form-group">
                <label>Projet</label>
                <select name="project">
                  <option value="">Aucun</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.name}>{p.name}</option>
                  ))}
                </select>
              </div>
              
              <div className="form-group">
                <label>Description</label>
                <textarea name="description" />
              </div>
              
              <button type="submit" className="btn btn-primary" style={{width: '100%'}}>
                Créer la tâche
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}