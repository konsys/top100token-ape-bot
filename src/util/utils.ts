

export const checkIsAddress = (address: string) => {
    const regex = /0x[a-fA-F0-9]{40}/;
    return address.match(regex);
}