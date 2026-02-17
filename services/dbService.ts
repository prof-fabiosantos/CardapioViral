import { supabase } from '../lib/supabaseClient';
import { GeneratedContent, PublicProduct } from '../types';

export const dbService = {
  /**
   * Salva um conteúdo gerado pela IA no banco de dados.
   */
  async saveGeneratedContent(userId: string, content: GeneratedContent) {
    const contentToSave = { ...content };

    const { error } = await supabase.from('generated_contents').insert({
      user_id: userId,
      type: content.type,
      content: contentToSave
    });

    if (error) {
      if (error.code === '42P01') { 
         console.warn("⚠️ Tabela 'generated_contents' não existe no Supabase. O histórico não será salvo.");
         return; 
      }
      console.error('Erro ao salvar conteúdo:', error);
      throw error;
    }
  },

  /**
   * Busca a contagem de conteúdos gerados pelo usuário no período (ex: este mês).
   */
  async getGenerationCount(userId: string): Promise<number> {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { count, error } = await supabase
      .from('generated_contents')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', startOfMonth.toISOString());

    if (error) {
      if (error.code === '42P01') return 0; 
      console.error('Erro ao contar gerações:', error);
      return 0;
    }

    return count || 0;
  },

  /**
   * Busca o histórico de conteúdos gerados.
   */
  async getGeneratedHistory(userId: string, limit = 20): Promise<GeneratedContent[]> {
    const { data, error } = await supabase
      .from('generated_contents')
      .select('content, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      if (error.code === '42P01') return []; 
      console.error('Erro ao buscar histórico:', error);
      return [];
    }

    return data.map((row: any) => ({
      ...row.content,
      created_at: row.created_at
    }));
  },

  /**
   * Analytics
   */
  async trackEvent(profileId: string, eventType: 'VIEW' | 'CLICK_WHATSAPP') {
    try {
       await supabase.from('analytics_events').insert({
         profile_id: profileId,
         event_type: eventType
       });
    } catch (err) {
      console.warn('Analytics failed to push:', err);
    }
  },

  async getAnalyticsStats(profileId: string) {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { count: visits, error: vError } = await supabase
      .from('analytics_events')
      .select('*', { count: 'exact', head: true })
      .eq('profile_id', profileId)
      .eq('event_type', 'VIEW')
      .gte('created_at', sevenDaysAgo.toISOString());
    
    if (vError && vError.code === '42P01') return { visits: 0, clicks: 0 };

    const { count: clicks } = await supabase
      .from('analytics_events')
      .select('*', { count: 'exact', head: true })
      .eq('profile_id', profileId)
      .eq('event_type', 'CLICK_WHATSAPP')
      .gte('created_at', sevenDaysAgo.toISOString());

    return {
      visits: visits || 0,
      clicks: clicks || 0
    };
  },

  /**
   * MARKETPLACE / DISCOVERY
   * Busca produtos de todos os restaurantes com filtros
   */
  async searchGlobalProducts(filters: {
    location?: string; // Cidade OU Bairro
    category?: string;
    minPrice?: number;
    maxPrice?: number;
    searchTerm?: string;
  }): Promise<PublicProduct[]> {
    try {
      let userIdsToFilter: string[] | undefined;

      // 1. ESTRATÉGIA CRÍTICA: Se houver filtro de Localização, buscamos PERFIS PRIMEIRO.
      // Isso corrige o bug onde a busca de produtos genérica ignora resultados locais se eles não estiverem nos top 50 globais.
      if (filters.location && filters.location.trim() !== '') {
         // Tenta buscar em cidade OU bairro
         // Nota: Isso assume que a tabela profiles tem a coluna neighborhood.
         // Se der erro (coluna não existe), tentamos apenas city no catch/fallback
         
         const term = filters.location.trim();
         
         // Usamos ilike em city OR neighborhood
         const { data: profiles, error } = await supabase
            .from('profiles')
            .select('user_id')
            .or(`city.ilike.%${term}%,neighborhood.ilike.%${term}%`); // Sintaxe do Supabase para OR
         
         if (error) {
             console.warn('Erro ao filtrar por bairro/cidade (possivelmente coluna inexistente), tentando apenas cidade...', error.message);
             // Fallback: Busca apenas por cidade se a coluna bairro não existir ainda no DB
             const { data: cityProfiles } = await supabase
                .from('profiles')
                .select('user_id')
                .ilike('city', `%${term}%`);
                
             if (!cityProfiles || cityProfiles.length === 0) return [];
             userIdsToFilter = cityProfiles.map(p => p.user_id);
         } else {
             if (!profiles || profiles.length === 0) return [];
             userIdsToFilter = profiles.map((p: any) => p.user_id);
         }
      }

      // 2. Query de Produtos
      // Agora filtramos os produtos apenas dos usuários encontrados (se houver filtro de local)
      let query = supabase.from('products').select('*');

      if (userIdsToFilter) {
         query = query.in('user_id', userIdsToFilter);
      }

      if (filters.category) {
        query = query.eq('category', filters.category);
      }
      if (filters.minPrice !== undefined) {
        query = query.gte('price', filters.minPrice);
      }
      if (filters.maxPrice !== undefined) {
        query = query.lte('price', filters.maxPrice);
      }
      if (filters.searchTerm) {
        query = query.ilike('name', `%${filters.searchTerm}%`);
      }

      // Limitamos a 50 produtos para não sobrecarregar
      const { data: products, error } = await query.limit(50);
      
      if (error) throw error;
      if (!products || products.length === 0) return [];

      // 3. Buscamos os perfis desses usuários (Restaurantes) para preencher os cards
      const distinctUserIds = [...new Set(products.map((p: any) => p.user_id))];
      
      // Tenta buscar com neighborhood
      let profilesData;
      let profilesError;
      
      const responseFull = await supabase
         .from('profiles')
         .select('user_id, name, slug, city, neighborhood, phone, logo_url')
         .in('user_id', distinctUserIds);

      if (responseFull.error && (responseFull.error.message?.includes('neighborhood') || responseFull.error.code === '42703')) {
          // Fallback se a coluna não existir
          console.warn("Retrying profile fetch without neighborhood column");
          const responseLegacy = await supabase
             .from('profiles')
             .select('user_id, name, slug, city, phone, logo_url')
             .in('user_id', distinctUserIds);
          profilesData = responseLegacy.data;
          profilesError = responseLegacy.error;
      } else {
          profilesData = responseFull.data;
          profilesError = responseFull.error;
      }
      
      if (profilesError) throw profilesError;
      const profiles = profilesData;

      // 4. Cruzamos os dados (Join manual no cliente)
      const results: PublicProduct[] = [];
      
      products.forEach((product: any) => {
        const ownerProfile = profiles?.find((p: any) => p.user_id === product.user_id);
        if (ownerProfile) {
          results.push({
            ...product,
            profile: {
              name: ownerProfile.name,
              slug: ownerProfile.slug,
              city: ownerProfile.city,
              neighborhood: ownerProfile.neighborhood, // pode ser undefined se cair no fallback
              phone: ownerProfile.phone,
              logo_url: ownerProfile.logo_url
            }
          });
        }
      });

      return results;

    } catch (err) {
      console.error("Erro na busca global:", err);
      return [];
    }
  }
};