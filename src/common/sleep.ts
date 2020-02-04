export async function sleep(time: number = 0): Promise<void> {
    return new Promise(r => setTimeout(r, time));
}
