'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, Sparkles, RefreshCw, History, Check, Brain, Zap, LogOut, User, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

// Configuration Supabase - REMPLACER PAR VOS VRAIES VALEURS
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''; // Remplacer par votre URL Supabase
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''; // Remplacer par votre clé Anon
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface PromptHistory {
  id: string;
  profile: string;
  goal: string;
  level: string;
  prompt: string;
  thinking: string;
  timestamp: number;
  user_id?: string;
}

interface FormData {
  profile: string;
  goal: string;
  level: string;
  context: string;
  constraints: string;
}

interface AuthUser {
  id: string;
  email: string;
}

const PromptForge = () => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [authData, setAuthData] = useState({ email: '', password: '' });
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  const [formData, setFormData] = useState<FormData>({
    profile: '',
    goal: '',
    level: 'Intermédiaire',
    context: '',
    constraints: ''
  });
  
  const [generatedPrompt, setGeneratedPrompt] = useState<string>('');
  const [thinkingProcess, setThinkingProcess] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [history, setHistory] = useState<PromptHistory[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showThinking, setShowThinking] = useState(false);

  useEffect(() => {
    checkUser();
    
    // Écouter les changements d'authentification
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUser({ id: session.user.id, email: session.user.email || '' });
        loadHistoryFromDB(session.user.id);
      } else {
        setUser(null);
        setHistory([]);
      }
    });

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  const checkUser = async () => {
    try {
      const { data } = await supabase.auth.getUser();
      if (data?.user) {
        setUser({ id: data.user.id, email: data.user.email || '' });
        loadHistoryFromDB(data.user.id);
      }
    } catch (error) {
      console.error('Error checking user:', error);
    }
  };

  const loadHistoryFromDB = async (userId: string) => {
    const { data } = await supabase
      .from('prompt_history')
      .select('*')
      .eq('user_id', userId)
      .order('timestamp', { ascending: false })
      .limit(10);

    if (data) {
      setHistory(data);
    }
  };

  const handleAuth = async () => {
    if (!authData.email || !authData.password) {
      setAuthError('Email et mot de passe requis');
      return;
    }

    setAuthLoading(true);
    setAuthError('');

    try {
      if (authMode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email: authData.email,
          password: authData.password,
        });
        if (error) throw error;
        if (data.user && data.user.identities && data.user.identities.length === 0) {
          setAuthError('Cet email existe déjà');
        } else {
          setAuthError('✓ Compte créé ! Vérifiez votre email.');
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: authData.email,
          password: authData.password,
        });
        if (error) throw error;
        if (data.user) {
          setUser({ id: data.user.id, email: data.user.email || '' });
          loadHistoryFromDB(data.user.id);
        }
      }
    } catch (error: any) {
      setAuthError(error.message || 'Une erreur est survenue');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setHistory([]);
  };

  const saveToHistory = async (prompt: string, thinking: string) => {
    const newEntry: PromptHistory = {
      id: Date.now().toString(),
      profile: formData.profile,
      goal: formData.goal,
      level: formData.level,
      prompt,
      thinking,
      timestamp: Date.now(),
      user_id: user?.id
    };
    
    if (user) {
      await supabase.from('prompt_history').insert([newEntry]);
      loadHistoryFromDB(user.id);
    } else {
      const updatedHistory = [newEntry, ...history].slice(0, 10);
      setHistory(updatedHistory);
    }
  };

  const generatePrompt = async () => {
    if (!formData.profile || !formData.goal) {
      alert('Veuillez remplir le profil et l\'objectif');
      return;
    }

    setIsLoading(true);
    setGeneratedPrompt('');
    setThinkingProcess('');

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        throw new Error(`Erreur API: ${response.status}`);
      }

      const text = await response.text();
      let data: any;
      
      try {
        data = JSON.parse(text);
      } catch (e) {
        // Si la réponse n'est pas du JSON, on la traite comme du texte brut
        data = { prompt: text, thinking: '' };
      }

      const prompt = data.prompt || (typeof data === 'string' ? data : '');
      const thinking = data.thinking || '';

      setGeneratedPrompt(prompt);
      setThinkingProcess(thinking);
      saveToHistory(prompt, thinking);

    } catch (error: any) {
      console.error('Erreur lors de la génération:', error);
      
      // Mode fallback si l'API ne répond pas
      const fallbackThinking = `🧠 ANALYSE DE LA DEMANDE (Mode Fallback)


1. COMPRÉHENSION DU CONTEXTE
   - Profil: ${formData.profile}
   - Niveau: ${formData.level}
   - Objectif: ${formData.goal}
   ${formData.context ? `- Contexte: ${formData.context}` : ''}
   ${formData.constraints ? `- Contraintes: ${formData.constraints}` : ''}

2. STRATÉGIE DE PROMPT
   - Mots-clés spécifiques et techniques
   - Rôle clair pour l'IA
   - Format de sortie défini
   - Critères de qualité mesurables`;

      const fallbackPrompt = `# 🎯 PROMPT OPTIMISÉ POUR ${formData.profile.toUpperCase()}

## 📋 CONTEXTE
Tu es un assistant IA expert spécialisé en **${formData.profile}**.
Niveau requis: **${formData.level}**

## 🎯 OBJECTIF
${formData.goal}

${formData.context ? `## 🔍 CONTEXTE ADDITIONNEL\n${formData.context}\n` : ''}
${formData.constraints ? `## ⚠️ CONTRAINTES\n${formData.constraints}\n` : ''}

## 📝 INSTRUCTIONS

### 1️⃣ Analyse initiale
- Identifier les concepts clés de "${formData.goal}"
- Déterminer les prérequis niveau ${formData.level}

### 2️⃣ Structuration
- Vue d'ensemble puis détails
- Théorie et exemples pratiques
- Applications concrètes

### 3️⃣ Qualité
- Information précise et vérifiable
- Adaptation au niveau ${formData.level}
- Sources et références

## ✅ CRITÈRES
✓ Précision factuelle
✓ Adapté à "${formData.profile}"
✓ Actionnable
✓ Vocabulaire niveau ${formData.level}`;

      setThinkingProcess(fallbackThinking);
      setGeneratedPrompt(fallbackPrompt);
      saveToHistory(fallbackPrompt, fallbackThinking);
      
      // Notification à l'utilisateur
      setAuthError('⚠️ Mode hors ligne activé');
      setTimeout(() => setAuthError(''), 3000);
    } finally {
      setIsLoading(false);
    }
  };

const copyToClipboard = () => {
  // Trouver l'index du premier et du dernier guillemet
  const firstQuoteIndex = generatedPrompt.indexOf('"');
  const lastQuoteIndex = generatedPrompt.lastIndexOf('"');

  // Vérifier qu'il y a au moins deux guillemets
  if (firstQuoteIndex !== -1 && lastQuoteIndex !== -1 && firstQuoteIndex !== lastQuoteIndex) {
    const textToCopy = generatedPrompt.slice(firstQuoteIndex + 1, lastQuoteIndex);
    navigator.clipboard.writeText(textToCopy);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  } else {
    console.warn("Aucun texte entre guillemets trouvé !");
  }
};


  const loadFromHistory = (item: PromptHistory) => {
    setFormData({
      profile: item.profile,
      goal: item.goal,
      level: item.level,
      context: '',
      constraints: ''
    });
    setGeneratedPrompt(item.prompt);
    setThinkingProcess(item.thinking);
    setShowHistory(false);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-red-950 to-black flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md"
        >
          <div className="text-center mb-8">
            <motion.div
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="inline-block"
            >
              <Brain className="w-16 h-16 text-red-500 mx-auto mb-4" />
            </motion.div>
            <h1 className="text-5xl font-bold bg-gradient-to-r from-red-500 to-red-700 bg-clip-text text-transparent mb-2">
              PromptForge
            </h1>
            <p className="text-red-300">Générateur de prompts IA avancé</p>
          </div>

          <div className="bg-gradient-to-br from-gray-900 to-black rounded-2xl shadow-2xl p-8 border-2 border-red-900">
            <div className="flex gap-2 mb-6">
              <button
                onClick={() => setAuthMode('login')}
                className={`flex-1 py-2 rounded-lg font-semibold transition ${
                  authMode === 'login'
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:text-white'
                }`}
              >
                Connexion
              </button>
              <button
                onClick={() => setAuthMode('signup')}
                className={`flex-1 py-2 rounded-lg font-semibold transition ${
                  authMode === 'signup'
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:text-white'
                }`}
              >
                Inscription
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-red-300 text-sm font-semibold mb-2">
                  <Mail className="w-4 h-4 inline mr-2" />
                  Email
                </label>
                <input
                  type="email"
                  value={authData.email}
                  onChange={(e) => setAuthData({ ...authData, email: e.target.value })}
                  onKeyPress={(e) => e.key === 'Enter' && handleAuth()}
                  className="w-full px-4 py-3 bg-gray-800 border-2 border-gray-700 rounded-lg focus:border-red-500 focus:outline-none transition text-white"
                  placeholder="votre@email.com"
                />
              </div>

              <div>
                <label className="block text-red-300 text-sm font-semibold mb-2">
                  <Lock className="w-4 h-4 inline mr-2" />
                  Mot de passe
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={authData.password}
                    onChange={(e) => setAuthData({ ...authData, password: e.target.value })}
                    onKeyPress={(e) => e.key === 'Enter' && handleAuth()}
                    className="w-full px-4 py-3 bg-gray-800 border-2 border-gray-700 rounded-lg focus:border-red-500 focus:outline-none transition text-white pr-12"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500 transition"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {authError && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-300 text-sm"
                >
                  {authError}
                </motion.div>
              )}

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleAuth}
                disabled={authLoading}
                className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-bold py-3 rounded-lg transition disabled:opacity-50 shadow-lg"
              >
                {authLoading ? 'Chargement...' : authMode === 'login' ? 'Se connecter' : 'S\'inscrire'}
              </motion.button>
            </div>

            <p className="text-center text-gray-500 text-sm mt-6">
              {authMode === 'login' ? "Pas encore de compte ?" : "Déjà inscrit ?"}{' '}
              <button
                onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}
                className="text-red-500 hover:text-red-400 font-semibold"
              >
                {authMode === 'login' ? 'Créer un compte' : 'Se connecter'}
              </button>
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-red-950 to-black py-8 px-4">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-between items-center mb-8"
        >
          <div className="flex items-center gap-3">
            <Brain className="w-12 h-12 text-red-500" />
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-red-500 to-red-700 bg-clip-text text-transparent">
                PromptForge
              </h1>
              <p className="text-red-300 text-sm">Générateur de prompts IA</p>
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleLogout}
            className="bg-gray-900 hover:bg-gray-800 text-red-400 px-4 py-2 rounded-lg transition flex items-center gap-2 border border-red-900"
          >
            <User className="w-4 h-4" />
            {user.email}
            <LogOut className="w-4 h-4 ml-2" />
          </motion.button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-gradient-to-br from-gray-900 to-black rounded-2xl shadow-2xl p-8 mb-6 border-2 border-red-900"
        >
          <div className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-red-300 text-sm font-semibold mb-2">
                  👤 Profil
                </label>
                <input
                  type="text"
                  placeholder="Ex: Data Scientist, Avocat..."
                  value={formData.profile}
                  onChange={(e) => setFormData({ ...formData, profile: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-800 border-2 border-gray-700 rounded-lg focus:border-red-500 focus:outline-none transition text-white placeholder-gray-500"
                />
              </div>

              <div>
                <label className="block text-red-300 text-sm font-semibold mb-2">
                  📊 Niveau d'expertise
                </label>
                <select
                  value={formData.level}
                  onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-800 border-2 border-gray-700 rounded-lg focus:border-red-500 focus:outline-none transition text-white"
                >
                  <option>Débutant</option>
                  <option>Intermédiaire</option>
                  <option>Avancé</option>
                  <option>Expert</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-red-300 text-sm font-semibold mb-2">
                🎯 Objectif principal
              </label>
              <textarea
                placeholder="Décrivez précisément ce que vous voulez accomplir..."
                value={formData.goal}
                onChange={(e) => setFormData({ ...formData, goal: e.target.value })}
                rows={3}
                className="w-full px-4 py-3 bg-gray-800 border-2 border-gray-700 rounded-lg focus:border-red-500 focus:outline-none transition resize-none text-white placeholder-gray-500"
              />
            </div>

            <div>
              <label className="block text-red-300 text-sm font-semibold mb-2">
                🔍 Contexte additionnel (optionnel)
              </label>
              <textarea
                placeholder="Informations supplémentaires..."
                value={formData.context}
                onChange={(e) => setFormData({ ...formData, context: e.target.value })}
                rows={2}
                className="w-full px-4 py-3 bg-gray-800 border-2 border-gray-700 rounded-lg focus:border-red-500 focus:outline-none transition resize-none text-white placeholder-gray-500"
              />
            </div>

            <div>
              <label className="block text-red-300 text-sm font-semibold mb-2">
                ⚠️ Contraintes (optionnel)
              </label>
              <input
                type="text"
                placeholder="Ex: Moins de 500 mots..."
                value={formData.constraints}
                onChange={(e) => setFormData({ ...formData, constraints: e.target.value })}
                className="w-full px-4 py-3 bg-gray-800 border-2 border-gray-700 rounded-lg focus:border-red-500 focus:outline-none transition text-white placeholder-gray-500"
              />
            </div>

            <div className="flex gap-3">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={generatePrompt}
                disabled={isLoading}
                className="flex-1 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-bold py-4 px-6 rounded-xl transition disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    Génération...
                  </>
                ) : (
                  <>
                    <Zap className="w-5 h-5" />
                    Générer le prompt
                  </>
                )}
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowHistory(!showHistory)}
                className="bg-gray-800 hover:bg-gray-700 text-red-400 p-4 rounded-xl transition border border-red-900"
              >
                <History className="w-5 h-5" />
              </motion.button>
            </div>
          </div>
        </motion.div>

        <AnimatePresence>
          {showHistory && history.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-gradient-to-br from-gray-900 to-black rounded-2xl shadow-2xl p-6 mb-6 border-2 border-red-900 overflow-hidden"
            >
              <h3 className="font-semibold text-red-400 mb-4 flex items-center gap-2">
                <History className="w-5 h-5" />
                Historique récent
              </h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {history.map((item) => (
                  <motion.div
                    key={item.id}
                    whileHover={{ scale: 1.01, x: 5 }}
                    onClick={() => loadFromHistory(item)}
                    className="p-3 bg-gray-800 rounded-lg cursor-pointer hover:bg-red-900/20 transition border border-gray-700 hover:border-red-700"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-red-300">{item.profile}</p>
                        <p className="text-xs text-gray-400 truncate">{item.goal}</p>
                      </div>
                      <span className="text-xs text-gray-500 ml-2">
                        {new Date(item.timestamp).toLocaleDateString()}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {thinkingProcess && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-to-br from-red-950 to-black rounded-2xl shadow-2xl p-6 mb-6 border-2 border-red-800"
            >
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-red-400 flex items-center gap-2">
                  <Brain className="w-6 h-6" />
                  Processus de réflexion
                </h2>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowThinking(!showThinking)}
                  className="text-sm bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition"
                >
                  {showThinking ? 'Masquer' : 'Afficher'}
                </motion.button>
              </div>
              
              <AnimatePresence>
                {showThinking && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="bg-gray-900/50 rounded-xl p-6 whitespace-pre-wrap text-red-200 text-sm leading-relaxed overflow-hidden"
                  >
                    {thinkingProcess}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {generatedPrompt && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-to-br from-gray-900 to-black rounded-2xl shadow-2xl p-8 border-2 border-red-900"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold bg-gradient-to-r from-red-500 to-red-700 bg-clip-text text-transparent flex items-center gap-2">
                  <Sparkles className="w-7 h-7 text-red-500" />
                  Prompt optimisé
                </h2>
                <div className="flex gap-2">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={copyToClipboard}
                    className="bg-red-600 hover:bg-red-700 text-white px-5 py-2 rounded-lg transition flex items-center gap-2 shadow-md"
                  >
                    {isCopied ? (
                      <>
                        <Check className="w-4 h-4" />
                        Copié !
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        Copier
                      </>
                    )}
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={generatePrompt}
                    className="bg-gray-800 hover:bg-gray-700 text-red-400 px-5 py-2 rounded-lg transition flex items-center gap-2 border border-red-900"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Régénérer
                  </motion.button>
                </div>
              </div>
              
              <div className="bg-gray-900/50 rounded-xl p-6 whitespace-pre-wrap text-red-100 leading-relaxed font-mono text-sm border border-red-900/50">
                {generatedPrompt}
              </div>

              <div className="mt-4 p-4 bg-red-900/20 rounded-lg border border-red-800">
                <p className="text-sm text-red-300">
                  💡 <strong>Conseil:</strong> Ce prompt a été optimisé pour maximiser la précision des réponses de l'IA.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default PromptForge;