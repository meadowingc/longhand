function saveToLocalStorage(key: string, value: string): void {
    localStorage.setItem(key, value);
}

function getFromLocalStorage(key: string): string | null {
    return localStorage.getItem(key);
}

export { saveToLocalStorage, getFromLocalStorage };
