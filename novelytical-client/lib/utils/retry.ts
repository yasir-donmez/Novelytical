export async function wait(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export async function retry<T>(
    fn: () => Promise<T>,
    retries: number = 3,
    delay: number = 1000,
    backoff: number = 2
): Promise<T> {
    try {
        return await fn();
    } catch (error) {
        if (retries <= 0) throw error;

        await wait(delay);

        return retry(fn, retries - 1, delay * backoff, backoff);
    }
}
