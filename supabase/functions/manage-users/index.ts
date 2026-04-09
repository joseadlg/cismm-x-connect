import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const jsonResponse = (body: Record<string, unknown>) =>
    new Response(JSON.stringify(body), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
    });

const getCategoryByName = async (supabaseAdmin: ReturnType<typeof createClient>, categoryName?: string | null) => {
    if (!categoryName || !categoryName.trim()) {
        return { categoryId: null, categoryError: null };
    }

    const trimmedCategoryName = categoryName.trim();
    const { data: category, error: categoryError } = await supabaseAdmin
        .from('exhibitor_categories')
        .select('id, name')
        .eq('name', trimmedCategoryName)
        .maybeSingle();

    if (categoryError) {
        return { categoryId: null, categoryError: 'Error al consultar la categoría: ' + categoryError.message };
    }

    if (!category) {
        return { categoryId: null, categoryError: `La categoría "${trimmedCategoryName}" no existe.` };
    }

    return { categoryId: category.id, categoryError: null };
};

const optionalText = (value: unknown) => {
    if (typeof value !== 'string') {
        return null;
    }

    const trimmedValue = value.trim();
    return trimmedValue ? trimmedValue : null;
};

const optionalPositiveInteger = (value: unknown) => {
    const parsedValue = Number(value);
    return Number.isInteger(parsedValue) && parsedValue > 0 ? parsedValue : null;
};

const normalizeTextCode = (value: string) =>
    value
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

const generateAttendeeInternalCode = (name: string) => {
    const baseCode = normalizeTextCode(name).slice(0, 24) || 'asistente';
    const randomSuffix = crypto.randomUUID().replace(/-/g, '').slice(0, 6);
    return `${baseCode}-${randomSuffix}`;
};

const buildAttendeeAccessPassword = (userId: string) => `cismm-${userId}-secret`;

const normalizeAttendeeCategoryInput = (value: unknown) => {
    if (typeof value !== 'string') {
        return 'general';
    }

    const normalizedValue = value
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');

    if (normalizedValue === 'vip') {
        return 'vip';
    }

    if (normalizedValue === 'juez' || normalizedValue === 'judge') {
        return 'juez';
    }

    return 'general';
};

const normalizeRoleInput = (value: unknown) => {
    if (typeof value !== 'string') {
        return '';
    }

    return value
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
};

const resolveProfileRoleInput = (roleInput: unknown, attendeeCategoryInput: unknown) => {
    const normalizedRole = normalizeRoleInput(roleInput);

    if (normalizedRole === 'vip') {
        return { profileRole: 'attendee', attendeeCategory: 'vip' as const };
    }

    if (normalizedRole === 'juez' || normalizedRole === 'judge') {
        return { profileRole: 'attendee', attendeeCategory: 'juez' as const };
    }

    if (normalizedRole === 'attendee') {
        return { profileRole: 'attendee', attendeeCategory: normalizeAttendeeCategoryInput(attendeeCategoryInput) };
    }

    if (normalizedRole === 'admin' || normalizedRole === 'exhibitor' || normalizedRole === 'speaker') {
        return { profileRole: normalizedRole, attendeeCategory: 'general' as const };
    }

    return null;
};

const normalizeSpeakerIds = (speakerIds: unknown) => {
    const rawSpeakerIds = Array.isArray(speakerIds)
        ? speakerIds
        : typeof speakerIds === 'string'
            ? speakerIds.split(',')
            : [];

    return [...new Set(
        rawSpeakerIds
            .map((speakerId) => Number(speakerId))
            .filter((speakerId) => Number.isInteger(speakerId) && speakerId > 0)
    )];
};

const validateSpeakerIds = async (supabaseAdmin: ReturnType<typeof createClient>, speakerIds: number[]) => {
    if (speakerIds.length === 0) {
        return null;
    }

    const { data: speakers, error } = await supabaseAdmin
        .from('speakers')
        .select('id')
        .in('id', speakerIds);

    if (error) {
        return 'Error al validar los ponentes de la sesión: ' + error.message;
    }

    if ((speakers || []).length !== speakerIds.length) {
        return 'Uno o más speakerIds no existen.';
    }

    return null;
};

const syncSessionSpeakers = async (supabaseAdmin: ReturnType<typeof createClient>, sessionId: number, speakerIds: number[]) => {
    const { error: deleteError } = await supabaseAdmin
        .from('session_speakers')
        .delete()
        .eq('session_id', sessionId);

    if (deleteError) {
        return 'Error al limpiar los ponentes previos de la sesión: ' + deleteError.message;
    }

    if (speakerIds.length === 0) {
        return null;
    }

    const { error: insertError } = await supabaseAdmin
        .from('session_speakers')
        .insert(speakerIds.map((speakerId) => ({ session_id: sessionId, speaker_id: speakerId })));

    if (insertError) {
        return 'Error al guardar los ponentes de la sesión: ' + insertError.message;
    }

    return null;
};

const getSessionWithSpeakers = async (supabaseAdmin: ReturnType<typeof createClient>, sessionId: number) => {
    const { data: session, error } = await supabaseAdmin
        .from('agenda_sessions')
        .select('id, title, start_time, end_time, room, description, day, track, session_speakers(speaker_id)')
        .eq('id', sessionId)
        .single();

    if (error) {
        return { session: null, sessionError: 'Error al cargar la sesión guardada: ' + error.message };
    }

    return { session, sessionError: null };
};

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { action, payload } = await req.json();
        console.log('manage-users action:', action);

        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            return jsonResponse({ error: 'Unauthorized: No auth header' });
        }

        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

        if (authError || !user) {
            return jsonResponse({ error: 'Unauthorized: ' + (authError?.message ?? 'no user') });
        }

        const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('role, name')
            .eq('id', user.id)
            .single();
        const isAdmin = profile?.role === 'admin';
        const canManageNews = isAdmin || profile?.role === 'exhibitor';

        if (!isAdmin && action !== 'CREATE_NEWS_POST' && action !== 'DELETE_NEWS_POST') {
            return jsonResponse({ error: `Forbidden. Rol actual: ${profile?.role ?? 'sin perfil'}` });
        }

        if ((action === 'CREATE_NEWS_POST' || action === 'DELETE_NEWS_POST') && !canManageNews) {
            return jsonResponse({ error: `Forbidden. Rol actual: ${profile?.role ?? 'sin perfil'}` });
        }

        if (action === 'CREATE_STAFF') {
            const { email, password, name, role, exhibitorId, speakerId, maxDevices, attendeeCategory } = payload;
            const resolvedRoleConfig = resolveProfileRoleInput(role, attendeeCategory);

            if (!resolvedRoleConfig) {
                return jsonResponse({ error: 'Rol no válido para crear la cuenta.' });
            }

            const { profileRole, attendeeCategory: normalizedAttendeeCategory } = resolvedRoleConfig;
            const normalizedExhibitorId = optionalPositiveInteger(exhibitorId);
            const normalizedSpeakerId = optionalPositiveInteger(speakerId);

            if (profileRole === 'exhibitor' && !normalizedExhibitorId) {
                return jsonResponse({ error: 'La cuenta de expositor debe vincularse a un expositor existente.' });
            }

            if (profileRole === 'speaker' && !normalizedSpeakerId) {
                return jsonResponse({ error: 'La cuenta de ponente debe vincularse a un ponente existente.' });
            }

            if (profileRole === 'exhibitor') {
                const { data: linkedExhibitor, error: linkedExhibitorError } = await supabaseAdmin
                    .from('exhibitors')
                    .select('id')
                    .eq('id', normalizedExhibitorId)
                    .maybeSingle();

                if (linkedExhibitorError) {
                    return jsonResponse({ error: 'Error al validar el expositor vinculado: ' + linkedExhibitorError.message });
                }

                if (!linkedExhibitor) {
                    return jsonResponse({ error: 'No se encontró el expositor vinculado para esta cuenta.' });
                }
            }

            if (profileRole === 'speaker') {
                const { data: linkedSpeaker, error: linkedSpeakerError } = await supabaseAdmin
                    .from('speakers')
                    .select('id')
                    .eq('id', normalizedSpeakerId)
                    .maybeSingle();

                if (linkedSpeakerError) {
                    return jsonResponse({ error: 'Error al validar el ponente vinculado: ' + linkedSpeakerError.message });
                }

                if (!linkedSpeaker) {
                    return jsonResponse({ error: 'No se encontró el ponente vinculado para esta cuenta.' });
                }

                const { data: existingSpeakerProfile, error: existingSpeakerProfileError } = await supabaseAdmin
                    .from('profiles')
                    .select('id')
                    .eq('speaker_id', normalizedSpeakerId)
                    .eq('role', 'speaker')
                    .maybeSingle();

                if (existingSpeakerProfileError) {
                    return jsonResponse({ error: 'Error al validar si el ponente ya tiene cuenta: ' + existingSpeakerProfileError.message });
                }

                if (existingSpeakerProfile) {
                    return jsonResponse({ error: 'Este ponente ya tiene una cuenta de acceso vinculada.' });
                }
            }

            const { data: authData, error: createError } = await supabaseAdmin.auth.admin.createUser({
                email,
                password,
                email_confirm: true,
                user_metadata: { full_name: name }
            });

            if (createError) {
                return jsonResponse({ error: 'Error en Auth: ' + createError.message });
            }

            if (authData.user) {
                let defaultDeviceLimit = profileRole === 'exhibitor' ? 3 : 1;
                if (profileRole === 'admin') defaultDeviceLimit = 999;

                const { error: profileError } = await supabaseAdmin.from('profiles').insert([
                    {
                        id: authData.user.id,
                        name,
                        role: profileRole,
                        email,
                        attendee_category: profileRole === 'attendee' ? normalizedAttendeeCategory : 'general',
                        exhibitor_id: profileRole === 'exhibitor' ? normalizedExhibitorId : null,
                        speaker_id: profileRole === 'speaker' ? normalizedSpeakerId : null,
                        track: profileRole === 'attendee' ? 'General' : null,
                        max_devices: maxDevices !== undefined ? maxDevices : defaultDeviceLimit
                    }
                ]);
                if (profileError) {
                    const { error: rollbackError } = await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
                    const rollbackMessage = rollbackError
                        ? ` Además, no se pudo revertir el usuario en Auth: ${rollbackError.message}`
                        : ' El usuario de Auth fue revertido automáticamente.';

                    return jsonResponse({ error: 'Error al crear perfil: ' + profileError.message + rollbackMessage });
                }
            }

            return jsonResponse({ success: true, user: authData.user });
        }

        if (action === 'CREATE_ATTENDEE_QR') {
            const { name, attendeeCategory, email, phone, company, title, maxDevices } = payload;
            const trimmedName = typeof name === 'string' ? name.trim() : '';
            const normalizedAttendeeCategory = normalizeAttendeeCategoryInput(attendeeCategory);

            if (!trimmedName) {
                return jsonResponse({ error: 'El nombre es obligatorio para generar el QR del asistente.' });
            }

            const internalAttendeeCode = generateAttendeeInternalCode(trimmedName);
            const attendeeEmail = `${internalAttendeeCode}@asistente.cismm.com`;
            const attendeePassword = crypto.randomUUID();

            const { data: authData, error: createError } = await supabaseAdmin.auth.admin.createUser({
                email: attendeeEmail,
                password: attendeePassword,
                email_confirm: true,
                user_metadata: { full_name: trimmedName }
            });

            if (createError) {
                return jsonResponse({ error: 'Error en Auth al crear el asistente con QR: ' + createError.message });
            }

            if (authData.user) {
                const { error: accessPasswordError } = await supabaseAdmin.auth.admin.updateUserById(authData.user.id, {
                    password: buildAttendeeAccessPassword(authData.user.id)
                });

                if (accessPasswordError) {
                    const { error: rollbackError } = await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
                    const rollbackMessage = rollbackError
                        ? ` Además, no se pudo revertir el usuario en Auth: ${rollbackError.message}`
                        : ' El usuario de Auth fue revertido automáticamente.';

                    return jsonResponse({ error: 'Error al preparar el acceso QR del asistente: ' + accessPasswordError.message + rollbackMessage });
                }

                const { error: profileError } = await supabaseAdmin.from('profiles').insert([
                    {
                        id: authData.user.id,
                        name: trimmedName,
                        role: 'attendee',
                        attendee_category: normalizedAttendeeCategory,
                        email: optionalText(email),
                        phone: optionalText(phone),
                        company: optionalText(company),
                        title: optionalText(title),
                        track: 'General',
                        max_devices: maxDevices !== undefined ? maxDevices : 1
                    }
                ]);

                if (profileError) {
                    const { error: rollbackError } = await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
                    const rollbackMessage = rollbackError
                        ? ` Además, no se pudo revertir el usuario en Auth: ${rollbackError.message}`
                        : ' El usuario de Auth fue revertido automáticamente.';

                    return jsonResponse({ error: 'Error al crear el perfil del asistente con QR: ' + profileError.message + rollbackMessage });
                }
            }

            return jsonResponse({
                success: true,
                user: authData.user,
                attendee: {
                    id: authData.user?.id,
                    name: trimmedName,
                    attendeeCategory: normalizedAttendeeCategory,
                    loginEmail: authData.user?.email ?? attendeeEmail,
                    email: optionalText(email),
                    phone: optionalText(phone),
                    company: optionalText(company),
                    title: optionalText(title),
                }
            });
        }

        if (action === 'PREPARE_ATTENDEE_QR') {
            const { userId } = payload;

            if (!userId || typeof userId !== 'string') {
                return jsonResponse({ error: 'Falta userId para generar el QR temporal del asistente.' });
            }

            const { data: attendeeProfile, error: attendeeProfileError } = await supabaseAdmin
                .from('profiles')
                .select('id, name, role, attendee_category, email, phone, company, title')
                .eq('id', userId)
                .maybeSingle();

            if (attendeeProfileError) {
                return jsonResponse({ error: 'Error al cargar el asistente: ' + attendeeProfileError.message });
            }

            if (!attendeeProfile || attendeeProfile.role !== 'attendee') {
                return jsonResponse({ error: 'No se encontró un asistente válido para generar el QR temporal.' });
            }

            const { data: authLookup, error: authLookupError } = await supabaseAdmin.auth.admin.getUserById(userId);
            const authUserMissing = authLookupError?.message?.toLowerCase().includes('user not found');

            if (authLookupError && !authUserMissing) {
                return jsonResponse({ error: 'Error al consultar la cuenta del asistente en Auth: ' + authLookupError.message });
            }

            if (!authLookup.user?.email) {
                return jsonResponse({ error: 'La cuenta del asistente no tiene un correo interno válido para regenerar el acceso.' });
            }

            const { error: accessPasswordError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
                password: buildAttendeeAccessPassword(userId)
            });

            if (accessPasswordError) {
                return jsonResponse({ error: 'Error al preparar el acceso temporal del asistente: ' + accessPasswordError.message });
            }

            return jsonResponse({
                success: true,
                attendee: {
                    id: attendeeProfile.id,
                    name: attendeeProfile.name,
                    attendeeCategory: normalizeAttendeeCategoryInput(attendeeProfile.attendee_category),
                    loginEmail: authLookup.user.email,
                    email: optionalText(attendeeProfile.email),
                    phone: optionalText(attendeeProfile.phone),
                    company: optionalText(attendeeProfile.company),
                    title: optionalText(attendeeProfile.title),
                }
            });
        }

        if (action === 'CREATE_EXHIBITOR') {
            const { name, logoUrl, description, contact, website, standNumber, category } = payload;
            const { categoryId, categoryError } = await getCategoryByName(supabaseAdmin, category);

            if (categoryError) {
                return jsonResponse({ error: categoryError });
            }

            const { data: exhibitor, error: exhibitorError } = await supabaseAdmin
                .from('exhibitors')
                .insert({
                    name,
                    logo_url: logoUrl || null,
                    description: description || null,
                    contact: contact || null,
                    website: website || null,
                    stand_number: standNumber || null,
                    category_id: categoryId,
                })
                .select('id, name, logo_url, description, contact, website, stand_number, exhibitor_categories(name)')
                .single();

            if (exhibitorError) {
                return jsonResponse({ error: 'Error al crear el expositor: ' + exhibitorError.message });
            }

            return jsonResponse({ success: true, exhibitor });
        }

        if (action === 'UPDATE_EXHIBITOR') {
            const { exhibitorId, name, logoUrl, description, contact, website, standNumber, category } = payload;

            if (!exhibitorId) {
                return jsonResponse({ error: 'Falta exhibitorId para actualizar el expositor.' });
            }

            const { categoryId, categoryError } = await getCategoryByName(supabaseAdmin, category);

            if (categoryError) {
                return jsonResponse({ error: categoryError });
            }

            const { data: exhibitor, error: exhibitorError } = await supabaseAdmin
                .from('exhibitors')
                .update({
                    name,
                    logo_url: logoUrl || null,
                    description: description || null,
                    contact: contact || null,
                    website: website || null,
                    stand_number: standNumber || null,
                    category_id: categoryId,
                })
                .eq('id', exhibitorId)
                .select('id, name, logo_url, description, contact, website, stand_number, exhibitor_categories(name)')
                .single();

            if (exhibitorError) {
                return jsonResponse({ error: 'Error al actualizar el expositor: ' + exhibitorError.message });
            }

            return jsonResponse({ success: true, exhibitor });
        }

        if (action === 'CREATE_EXHIBITOR_CATEGORY') {
            const { name } = payload;
            const trimmedName = typeof name === 'string' ? name.trim() : '';

            if (!trimmedName) {
                return jsonResponse({ error: 'El nombre de la categoría es obligatorio.' });
            }

            const { data: category, error: categoryError } = await supabaseAdmin
                .from('exhibitor_categories')
                .insert({ name: trimmedName })
                .select('id, name')
                .single();

            if (categoryError) {
                return jsonResponse({ error: 'Error al crear la categoría: ' + categoryError.message });
            }

            return jsonResponse({ success: true, category });
        }

        if (action === 'CREATE_SPEAKER') {
            const { name, photoUrl, title, company, bio, social } = payload;
            const trimmedName = typeof name === 'string' ? name.trim() : '';

            if (!trimmedName) {
                return jsonResponse({ error: 'El nombre del ponente es obligatorio.' });
            }

            const { data: speaker, error: speakerError } = await supabaseAdmin
                .from('speakers')
                .insert({
                    name: trimmedName,
                    photo_url: optionalText(photoUrl),
                    title: optionalText(title),
                    company: optionalText(company),
                    bio: optionalText(bio),
                    social_linkedin: optionalText((social as { linkedin?: string } | undefined)?.linkedin),
                    social_twitter: optionalText((social as { twitter?: string } | undefined)?.twitter),
                })
                .select('id, name, photo_url, title, company, bio, social_linkedin, social_twitter')
                .single();

            if (speakerError) {
                return jsonResponse({ error: 'Error al crear el ponente: ' + speakerError.message });
            }

            return jsonResponse({ success: true, speaker });
        }

        if (action === 'UPDATE_SPEAKER') {
            const { speakerId, name, photoUrl, title, company, bio, social } = payload;
            const trimmedName = typeof name === 'string' ? name.trim() : '';

            if (!speakerId) {
                return jsonResponse({ error: 'Falta speakerId para actualizar el ponente.' });
            }

            if (!trimmedName) {
                return jsonResponse({ error: 'El nombre del ponente es obligatorio.' });
            }

            const { data: speaker, error: speakerError } = await supabaseAdmin
                .from('speakers')
                .update({
                    name: trimmedName,
                    photo_url: optionalText(photoUrl),
                    title: optionalText(title),
                    company: optionalText(company),
                    bio: optionalText(bio),
                    social_linkedin: optionalText((social as { linkedin?: string } | undefined)?.linkedin),
                    social_twitter: optionalText((social as { twitter?: string } | undefined)?.twitter),
                })
                .eq('id', speakerId)
                .select('id, name, photo_url, title, company, bio, social_linkedin, social_twitter')
                .single();

            if (speakerError) {
                return jsonResponse({ error: 'Error al actualizar el ponente: ' + speakerError.message });
            }

            return jsonResponse({ success: true, speaker });
        }

        if (action === 'CREATE_SESSION') {
            const { title, startTime, endTime, room, description, day, track, speakerIds: rawSpeakerIds } = payload;
            const trimmedTitle = typeof title === 'string' ? title.trim() : '';
            const speakerIds = normalizeSpeakerIds(rawSpeakerIds);

            if (!trimmedTitle) {
                return jsonResponse({ error: 'El título de la sesión es obligatorio.' });
            }

            const speakerValidationError = await validateSpeakerIds(supabaseAdmin, speakerIds);
            if (speakerValidationError) {
                return jsonResponse({ error: speakerValidationError });
            }

            const { data: insertedSession, error: sessionError } = await supabaseAdmin
                .from('agenda_sessions')
                .insert({
                    title: trimmedTitle,
                    start_time: typeof startTime === 'string' ? startTime.trim() : '',
                    end_time: typeof endTime === 'string' ? endTime.trim() : '',
                    room: optionalText(room),
                    description: optionalText(description),
                    day: optionalText(day),
                    track: optionalText(track),
                })
                .select('id')
                .single();

            if (sessionError) {
                return jsonResponse({ error: 'Error al crear la sesión: ' + sessionError.message });
            }

            const syncError = await syncSessionSpeakers(supabaseAdmin, insertedSession.id, speakerIds);
            if (syncError) {
                await supabaseAdmin.from('agenda_sessions').delete().eq('id', insertedSession.id);
                return jsonResponse({ error: syncError });
            }

            const { session, sessionError: savedSessionError } = await getSessionWithSpeakers(supabaseAdmin, insertedSession.id);
            if (savedSessionError) {
                return jsonResponse({ error: savedSessionError });
            }

            return jsonResponse({ success: true, session });
        }

        if (action === 'UPDATE_SESSION') {
            const { sessionId, title, startTime, endTime, room, description, day, track, speakerIds: rawSpeakerIds } = payload;
            const trimmedTitle = typeof title === 'string' ? title.trim() : '';
            const speakerIds = normalizeSpeakerIds(rawSpeakerIds);

            if (!sessionId) {
                return jsonResponse({ error: 'Falta sessionId para actualizar la sesión.' });
            }

            if (!trimmedTitle) {
                return jsonResponse({ error: 'El título de la sesión es obligatorio.' });
            }

            const speakerValidationError = await validateSpeakerIds(supabaseAdmin, speakerIds);
            if (speakerValidationError) {
                return jsonResponse({ error: speakerValidationError });
            }

            const { error: sessionError } = await supabaseAdmin
                .from('agenda_sessions')
                .update({
                    title: trimmedTitle,
                    start_time: typeof startTime === 'string' ? startTime.trim() : '',
                    end_time: typeof endTime === 'string' ? endTime.trim() : '',
                    room: optionalText(room),
                    description: optionalText(description),
                    day: optionalText(day),
                    track: optionalText(track),
                })
                .eq('id', sessionId);

            if (sessionError) {
                return jsonResponse({ error: 'Error al actualizar la sesión: ' + sessionError.message });
            }

            const syncError = await syncSessionSpeakers(supabaseAdmin, Number(sessionId), speakerIds);
            if (syncError) {
                return jsonResponse({ error: syncError });
            }

            const { session, sessionError: savedSessionError } = await getSessionWithSpeakers(supabaseAdmin, Number(sessionId));
            if (savedSessionError) {
                return jsonResponse({ error: savedSessionError });
            }

            return jsonResponse({ success: true, session });
        }

        if (action === 'UPDATE_EXHIBITOR_CATEGORY') {
            const { oldName, newName } = payload;
            const trimmedOldName = typeof oldName === 'string' ? oldName.trim() : '';
            const trimmedNewName = typeof newName === 'string' ? newName.trim() : '';

            if (!trimmedOldName || !trimmedNewName) {
                return jsonResponse({ error: 'Se requieren oldName y newName para actualizar la categoría.' });
            }

            const { data: category, error: categoryError } = await supabaseAdmin
                .from('exhibitor_categories')
                .update({ name: trimmedNewName })
                .eq('name', trimmedOldName)
                .select('id, name')
                .single();

            if (categoryError) {
                return jsonResponse({ error: 'Error al actualizar la categoría: ' + categoryError.message });
            }

            return jsonResponse({ success: true, category });
        }

        if (action === 'CREATE_NEWS_POST') {
            const { title, content, category } = payload;
            const trimmedTitle = typeof title === 'string' ? title.trim() : '';
            const trimmedContent = typeof content === 'string' ? content.trim() : '';
            const trimmedCategory = typeof category === 'string' ? category.trim() : '';

            if (!trimmedTitle || !trimmedContent || !trimmedCategory) {
                return jsonResponse({ error: 'title, content y category son obligatorios para publicar.' });
            }

            const { data: post, error: postError } = await supabaseAdmin
                .from('news_posts')
                .insert({
                    author_id: user.id,
                    author_name: profile?.name || user.email || 'Usuario',
                    author_role: isAdmin ? 'admin' : 'exhibitor',
                    title: trimmedTitle,
                    content: trimmedContent,
                    category: trimmedCategory,
                })
                .select('id, title, content, author_id, author_name, author_role, category, created_at')
                .single();

            if (postError) {
                return jsonResponse({ error: 'Error al crear el anuncio: ' + postError.message });
            }

            return jsonResponse({ success: true, post });
        }

        if (action === 'DELETE_SPEAKER') {
            const { speakerId } = payload;

            if (!speakerId) {
                return jsonResponse({ error: 'Falta speakerId para eliminar el ponente.' });
            }

            const { data: speaker, error: speakerError } = await supabaseAdmin
                .from('speakers')
                .select('id, name')
                .eq('id', speakerId)
                .maybeSingle();

            if (speakerError) {
                return jsonResponse({ error: 'Error al cargar el ponente: ' + speakerError.message });
            }

            if (!speaker) {
                return jsonResponse({ error: 'No se encontró el ponente a eliminar.' });
            }

            const { error: deleteSpeakerError } = await supabaseAdmin
                .from('speakers')
                .delete()
                .eq('id', speakerId);

            if (deleteSpeakerError) {
                return jsonResponse({ error: 'Error al eliminar el ponente: ' + deleteSpeakerError.message });
            }

            return jsonResponse({ success: true, deletedSpeakerId: speakerId, deletedSpeakerName: speaker.name });
        }

        if (action === 'RESET_USER_DEVICES') {
            const { userId } = payload;

            if (!userId) {
                return jsonResponse({ error: 'Falta userId para resetear dispositivos.' });
            }

            const { data: targetProfile, error: targetProfileError } = await supabaseAdmin
                .from('profiles')
                .select('id, name')
                .eq('id', userId)
                .maybeSingle();

            if (targetProfileError) {
                return jsonResponse({ error: 'Error al cargar el perfil para resetear dispositivos: ' + targetProfileError.message });
            }

            if (!targetProfile) {
                return jsonResponse({ error: 'No se encontró el usuario para resetear dispositivos.' });
            }

            const { error: resetDevicesError } = await supabaseAdmin
                .from('profiles')
                .update({ registered_devices: [], device_id: null })
                .eq('id', userId);

            if (resetDevicesError) {
                return jsonResponse({ error: 'Error al resetear dispositivos: ' + resetDevicesError.message });
            }

            return jsonResponse({ success: true, resetUserId: userId, resetUserName: targetProfile.name });
        }

        if (action === 'DELETE_USER') {
            const { userId } = payload;

            if (!userId) {
                return jsonResponse({ error: 'Falta userId para eliminar la cuenta.' });
            }

            if (userId === user.id) {
                return jsonResponse({ error: 'No puedes eliminar tu propia cuenta mientras estás usando el panel.' });
            }

            const { data: targetProfile, error: targetProfileError } = await supabaseAdmin
                .from('profiles')
                .select('id, role, name')
                .eq('id', userId)
                .maybeSingle();

            if (targetProfileError) {
                return jsonResponse({ error: 'Error al cargar el perfil: ' + targetProfileError.message });
            }

            if (!targetProfile) {
                return jsonResponse({ error: 'No se encontró el perfil a eliminar.' });
            }

            if (targetProfile.role === 'admin') {
                const { count: adminCount, error: adminCountError } = await supabaseAdmin
                    .from('profiles')
                    .select('id', { count: 'exact', head: true })
                    .eq('role', 'admin');

                if (adminCountError) {
                    return jsonResponse({ error: 'No se pudo validar el número de administradores: ' + adminCountError.message });
                }

                if ((adminCount ?? 0) <= 1) {
                    return jsonResponse({ error: 'No se puede eliminar el último administrador del sistema.' });
                }
            }

            const { data: authLookup, error: authLookupError } = await supabaseAdmin.auth.admin.getUserById(userId);
            const authUserMissing = authLookupError?.message?.toLowerCase().includes('user not found');

            if (authLookupError && !authUserMissing) {
                return jsonResponse({ error: 'Error al consultar el usuario en Auth: ' + authLookupError.message });
            }

            if (authLookup.user) {
                const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
                if (authDeleteError) {
                    return jsonResponse({ error: 'Error al eliminar el usuario en Auth: ' + authDeleteError.message });
                }
            }

            const { error: profileDeleteError } = await supabaseAdmin
                .from('profiles')
                .delete()
                .eq('id', userId);

            if (profileDeleteError) {
                return jsonResponse({ error: 'Error al eliminar el perfil: ' + profileDeleteError.message });
            }

            return jsonResponse({
                success: true,
                deletedUserId: userId,
                deletedName: targetProfile.name,
            });
        }

        if (action === 'DELETE_EXHIBITOR') {
            const { exhibitorId } = payload;

            if (!exhibitorId) {
                return jsonResponse({ error: 'Falta exhibitorId para eliminar el expositor.' });
            }

            const { data: targetExhibitor, error: targetExhibitorError } = await supabaseAdmin
                .from('exhibitors')
                .select('id, name')
                .eq('id', exhibitorId)
                .maybeSingle();

            if (targetExhibitorError) {
                return jsonResponse({ error: 'Error al cargar el expositor: ' + targetExhibitorError.message });
            }

            if (!targetExhibitor) {
                return jsonResponse({ error: 'No se encontró el expositor a eliminar.' });
            }

            const { data: linkedProfiles, error: linkedProfilesError } = await supabaseAdmin
                .from('profiles')
                .select('id, name, role')
                .eq('exhibitor_id', exhibitorId);

            if (linkedProfilesError) {
                return jsonResponse({ error: 'Error al consultar las cuentas ligadas al expositor: ' + linkedProfilesError.message });
            }

            if ((linkedProfiles ?? []).some((linkedProfile) => linkedProfile.id === user.id)) {
                return jsonResponse({ error: 'No puedes eliminar un expositor ligado a tu propia cuenta activa.' });
            }

            for (const linkedProfile of linkedProfiles ?? []) {
                const { data: authLookup, error: authLookupError } = await supabaseAdmin.auth.admin.getUserById(linkedProfile.id);
                const authUserMissing = authLookupError?.message?.toLowerCase().includes('user not found');

                if (authLookupError && !authUserMissing) {
                    return jsonResponse({ error: `Error al consultar la cuenta ${linkedProfile.name}: ` + authLookupError.message });
                }

                if (authLookup.user) {
                    const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(linkedProfile.id);
                    if (authDeleteError) {
                        return jsonResponse({ error: `Error al eliminar la cuenta ${linkedProfile.name}: ` + authDeleteError.message });
                    }
                } else {
                    const { error: orphanProfileDeleteError } = await supabaseAdmin
                        .from('profiles')
                        .delete()
                        .eq('id', linkedProfile.id);

                    if (orphanProfileDeleteError) {
                        return jsonResponse({ error: `Error al limpiar el perfil huérfano ${linkedProfile.name}: ` + orphanProfileDeleteError.message });
                    }
                }
            }

            const { error: exhibitorDeleteError } = await supabaseAdmin
                .from('exhibitors')
                .delete()
                .eq('id', exhibitorId);

            if (exhibitorDeleteError) {
                return jsonResponse({ error: 'Error al eliminar el expositor: ' + exhibitorDeleteError.message });
            }

            return jsonResponse({
                success: true,
                deletedExhibitorId: exhibitorId,
                deletedExhibitorName: targetExhibitor.name,
                deletedLinkedProfiles: (linkedProfiles ?? []).length,
            });
        }

        if (action === 'DELETE_SESSION') {
            const { sessionId } = payload;

            if (!sessionId) {
                return jsonResponse({ error: 'Falta sessionId para eliminar la sesión.' });
            }

            const { data: session, error: sessionError } = await supabaseAdmin
                .from('agenda_sessions')
                .select('id, title')
                .eq('id', sessionId)
                .maybeSingle();

            if (sessionError) {
                return jsonResponse({ error: 'Error al cargar la sesión: ' + sessionError.message });
            }

            if (!session) {
                return jsonResponse({ error: 'No se encontró la sesión a eliminar.' });
            }

            const { error: deleteSessionError } = await supabaseAdmin
                .from('agenda_sessions')
                .delete()
                .eq('id', sessionId);

            if (deleteSessionError) {
                return jsonResponse({ error: 'Error al eliminar la sesión: ' + deleteSessionError.message });
            }

            return jsonResponse({ success: true, deletedSessionId: sessionId, deletedSessionTitle: session.title });
        }

        if (action === 'DELETE_NEWS_POST') {
            const { postId } = payload;

            if (!postId) {
                return jsonResponse({ error: 'Falta postId para eliminar el anuncio.' });
            }

            const { data: post, error: postError } = await supabaseAdmin
                .from('news_posts')
                .select('id, author_id, title')
                .eq('id', postId)
                .maybeSingle();

            if (postError) {
                return jsonResponse({ error: 'Error al cargar el anuncio: ' + postError.message });
            }

            if (!post) {
                return jsonResponse({ error: 'No se encontró el anuncio a eliminar.' });
            }

            if (!isAdmin && post.author_id !== user.id) {
                return jsonResponse({ error: 'Solo puedes eliminar tus propios anuncios.' });
            }

            const { error: deletePostError } = await supabaseAdmin
                .from('news_posts')
                .delete()
                .eq('id', postId);

            if (deletePostError) {
                return jsonResponse({ error: 'Error al eliminar el anuncio: ' + deletePostError.message });
            }

            return jsonResponse({ success: true, deletedPostId: postId, deletedPostTitle: post.title });
        }

        if (action === 'DELETE_EXHIBITOR_CATEGORY') {
            const { categoryName } = payload;
            const trimmedCategoryName = typeof categoryName === 'string' ? categoryName.trim() : '';

            if (!trimmedCategoryName) {
                return jsonResponse({ error: 'Falta categoryName para eliminar la categoría.' });
            }

            const { data: category, error: categoryError } = await supabaseAdmin
                .from('exhibitor_categories')
                .select('id, name')
                .eq('name', trimmedCategoryName)
                .maybeSingle();

            if (categoryError) {
                return jsonResponse({ error: 'Error al cargar la categoría: ' + categoryError.message });
            }

            if (!category) {
                return jsonResponse({ error: 'No se encontró la categoría a eliminar.' });
            }

            const { count: linkedExhibitorsCount, error: linkedExhibitorsError } = await supabaseAdmin
                .from('exhibitors')
                .select('id', { count: 'exact', head: true })
                .eq('category_id', category.id);

            if (linkedExhibitorsError) {
                return jsonResponse({ error: 'Error al validar el uso de la categoría: ' + linkedExhibitorsError.message });
            }

            if ((linkedExhibitorsCount ?? 0) > 0) {
                return jsonResponse({ error: 'No se puede eliminar esta categoría porque hay expositores que la utilizan.' });
            }

            const { error: deleteCategoryError } = await supabaseAdmin
                .from('exhibitor_categories')
                .delete()
                .eq('id', category.id);

            if (deleteCategoryError) {
                return jsonResponse({ error: 'Error al eliminar la categoría: ' + deleteCategoryError.message });
            }

            return jsonResponse({ success: true, deletedCategoryName: category.name });
        }

        return jsonResponse({ error: 'Accion no valida', receivedAction: action });
    } catch (error) {
        return jsonResponse({ error: error.message });
    }
});
