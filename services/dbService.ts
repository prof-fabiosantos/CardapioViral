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
    city?: string;
    category?: string;
    minPrice?: number;
    maxPrice?: number;
    searchTerm?: string;
  }): Promise<PublicProduct[]> {
    try {
      // 1. Primeiro buscamos os produtos que batem com os filtros de produto
      let query = supabase.from('products').select('*');

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

      // 2. Coletamos os IDs dos usuários donos desses produtos
      const userIds = [...new Set(products.map((p: any) => p.user_id))];

      // 3. Buscamos os perfis desses usuários (Restaurantes)
      // Se tiver filtro de cidade, aplicamos aqui
      let profilesQuery = supabase.from('profiles').select('user_id, name, slug, city, phone, logo_url').in('user_id', userIds);
      
      if (filters.city) {
        profilesQuery = profilesQuery.ilike('city', `%${filters.city}%`);
      }

      const { data: profiles, error: profilesError } = await profilesQuery;
      
      if (profilesError) throw profilesError;

      // 4. Cruzamos os dados (Join manual no cliente)
      // Apenas retornamos produtos cujo dono (profile) foi encontrado (respeitando o filtro de cidade)
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