// Supabase normally returns at most 1,000 rows per request. Read every page so
// accumulated XP, activity history, and content are not silently truncated.
export async function allRows<T>(query: {
  range: (
    from: number,
    to: number,
  ) => PromiseLike<{ data: T[] | null; error: unknown }>;
}): Promise<{ data: T[]; error: null }> {
  const collected: T[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await query.range(offset, offset + 999);
    if (error) throw error;
    const page = data || [];
    collected.push(...page);
    if (page.length < 1000) return { data: collected, error: null };
  }
}
