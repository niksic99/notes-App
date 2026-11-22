import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Button,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase';

type Note = {
  id: string;
  content: string;
};

type AuthMode = 'login' | 'register';

export default function Index() {
  const [user, setUser] = useState<User | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Pri otvaranju aplikacije provjeri postoji li spremljena Supabase sesija.
  useEffect(() => {
    let active = true;

    async function initialize() {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;

        const currentUser = data.session?.user ?? null;
        if (!active) return;

        setUser(currentUser);
        if (currentUser) {
          await loadNotesForUser(currentUser.id, () => active);
        }
      } catch (error) {
        if (active) setMessage(toErrorMessage(error, 'Učitavanje nije uspjelo.'));
      } finally {
        if (active) setLoading(false);
      }
    }

    initialize();
    return () => {
      active = false;
    };
  }, []);

  async function loadNotesForUser(userId: string, isActive: () => boolean = () => true) {
    const { data, error } = await supabase
      .from('notes')
      .select('id, content')
      .eq('user_id', userId)
      .order('id', { ascending: false });

    if (error) throw error;
    if (isActive()) setNotes(data ?? []);
  }

  function toErrorMessage(error: unknown, fallback: string) {
    return error instanceof Error ? error.message : fallback;
  }

  async function saveNote() {
    const text = content.trim();
    if (!text || !user || saving) return;

    setSaving(true);
    setMessage('');

    try {
      const { data, error } = await supabase
        .from('notes')
        .insert({ content: text, user_id: user.id })
        .select('id, content')
        .single();

      if (error) throw error;
      setNotes((previous) => [data, ...previous]);
      setContent('');
    } catch (error) {
      setMessage(toErrorMessage(error, 'Spremanje bilješke nije uspjelo.'));
    } finally {
      setSaving(false);
    }
  }

  async function signIn() {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password) {
      setMessage('Upiši e-mail adresu i lozinku.');
      return;
    }

    setBusy(true);
    setMessage('');
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });
      if (error) throw error;

      setUser(data.user);
      await loadNotesForUser(data.user.id);
      setPassword('');
      setMessage('Uspješno si prijavljen/a.');
    } catch (error) {
      setMessage(toErrorMessage(error, 'Prijava nije uspjela. Provjeri podatke.'));
    } finally {
      setBusy(false);
    }
  }

  // Povezuje postojeći anonimni račun s e-mailom i lozinkom.
  // Ako nema aktivne sesije, prvo stvara anonimni račun pa ga povezuje.
  async function registerOrLinkAccount() {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setMessage('Upiši ispravnu e-mail adresu.');
      return;
    }
    if (password.length < 8) {
      setMessage('Lozinka mora imati barem 8 znakova.');
      return;
    }

    setBusy(true);
    setMessage('');
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;

      let currentUser = sessionData.session?.user ?? null;
      if (!currentUser) {
        const { data, error } = await supabase.auth.signInAnonymously();
        if (error) throw error;
        if (!data.user) throw new Error('Anonimni račun nije moguće izraditi.');
        currentUser = data.user;
      }

      if (!currentUser.is_anonymous) {
        throw new Error('Već koristiš trajni račun. Odjavi se prije registracije drugog računa.');
      }

      // Confirm email mora biti isključen u Supabaseu za ovaj testni postupak.
      const { data, error } = await supabase.auth.updateUser({
        email: cleanEmail,
        password,
      });
      if (error) throw error;
      if (!data.user) throw new Error('Račun nije moguće ažurirati.');

      setUser(data.user);
      await loadNotesForUser(data.user.id);
      setEmail('');
      setPassword('');
      setAuthMode('login');
      setMessage('Račun je uspješno povezan! Sada se možeš prijaviti e-mailom i lozinkom.');
    } catch (error) {
      setMessage(toErrorMessage(error, 'Registracija nije uspjela. Provjeri e-mail i postavke Supabasea.'));
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    setBusy(true);
    setMessage('');
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setUser(null);
      setNotes([]);
      setEmail('');
      setPassword('');
      setAuthMode('login');
      setMessage('Odjavljen/a si. Za nastavak se prijavi e-mailom i lozinkom.');
    } catch (error) {
      setMessage(toErrorMessage(error, 'Odjava nije uspjela.'));
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" />
        <Text>Učitavanje aplikacije...</Text>
      </View>
    );
  }

  // Ekran za prijavu kada trenutno nema aktivne sesije.
  if (!user) {
    return (
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.heading}>Moje bilješke</Text>
        <Text style={styles.description}>
          Prijavi se ili izradi račun kako bi tvoje bilješke bile dostupne i nakon ponovne prijave.
        </Text>

        {authMode === 'login' ? (
          <>
            <Text style={styles.subheading}>Prijava</Text>
            <TextInput
              style={styles.input}
              placeholder="E-mail adresa"
              placeholderTextColor="#777"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TextInput
              style={styles.input}
              placeholder="Lozinka"
              placeholderTextColor="#777"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
            />
            <Button title={busy ? 'Prijava...' : 'Prijavi se'} onPress={signIn} disabled={busy} />
            <View style={styles.spacer} />
            <Button
              title="Nemam račun — registracija"
              onPress={() => {
                setAuthMode('register');
                setMessage('');
              }}
              disabled={busy}
            />
          </>
        ) : (
          <>
            <Text style={styles.subheading}>Registracija</Text>
            <Text>Upiši e-mail adresu i lozinku (najmanje 8 znakova).</Text>
            <TextInput
              style={styles.input}
              placeholder="E-mail adresa"
              placeholderTextColor="#777"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TextInput
              style={styles.input}
              placeholder="Lozinka (najmanje 8 znakova)"
              placeholderTextColor="#777"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
            />
            <Button
              title={busy ? 'Izrada računa...' : 'Registriraj se'}
              onPress={registerOrLinkAccount}
              disabled={busy}
            />
            <View style={styles.spacer} />
            <Button
              title="Natrag na prijavu"
              onPress={() => {
                setAuthMode('login');
                          setPassword('');
                setMessage('');
              }}
              disabled={busy}
            />
          </>
        )}

        {!!message && <Text style={styles.message}>{message}</Text>}
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.heading}>Moje bilješke</Text>
      <Text style={styles.description}>
        Zapiši ideju ili obvezu. Bilješke se spremaju u Supabase.
      </Text>

      {user.is_anonymous ? (
        <View style={styles.accountBox}>
          <Text style={styles.subheading}>Spremi svoj račun</Text>
          <Text>
            Trenutačno koristiš anonimni račun. Poveži ga s e-mail adresom i lozinkom kako bi se mogao/la ponovno prijaviti i zadržati postojeće bilješke.
          </Text>
          <TextInput
            style={styles.input}
            placeholder="Tvoja e-mail adresa"
            placeholderTextColor="#777"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TextInput
            style={styles.input}
            placeholder="Lozinka (najmanje 8 znakova)"
            placeholderTextColor="#777"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
          />
          <Button
            title={busy ? 'Izrada računa...' : 'Poveži e-mail i lozinku'}
            onPress={registerOrLinkAccount}
            disabled={busy}
          />
        </View>
      ) : (
        <View style={styles.accountBox}>
          <Text style={styles.accountText}>Prijavljen/a kao: {user.email}</Text>
          <Button title={busy ? 'Odjava...' : 'Odjavi se'} onPress={signOut} disabled={busy} />
        </View>
      )}

      <TextInput
        style={styles.input}
        placeholder="Napiši bilješku..."
        placeholderTextColor="#777"
        value={content}
        onChangeText={setContent}
        multiline
        editable={!saving}
      />

      <Button
        title={saving ? 'Spremanje...' : 'Spremi bilješku'}
        onPress={saveNote}
        disabled={!content.trim() || saving}
      />

      <Text style={styles.subheading}>Spremljene bilješke</Text>
      {notes.length === 0 && <Text>Nema bilješki. Napiši prvu bilješku iznad.</Text>}
      {notes.map((note) => (
        <View key={note.id} style={styles.note}>
          <Text style={styles.noteText}>{note.content}</Text>
        </View>
      ))}

      {!!message && <Text style={styles.message}>{message}</Text>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    paddingTop: 50,
    gap: 16,
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  heading: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  description: {
    color: '#555',
    fontSize: 15,
  },
  subheading: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 12,
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: '#bbb',
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    backgroundColor: '#fff',
    color: '#111',
  },
  note: {
    padding: 16,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  noteText: {
    fontSize: 16,
    color: '#111',
  },
  accountBox: {
    padding: 16,
    borderRadius: 8,
    backgroundColor: '#eef2ff',
    gap: 12,
  },
  accountText: {
    fontSize: 15,
  },
  spacer: {
    height: 8,
  },
  message: {
    color: '#334155',
    lineHeight: 21,
  },
});
