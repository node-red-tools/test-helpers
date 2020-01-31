export class DockerError extends Error {
    public errors: Error[];

    constructor(msg: string, ...errors: Error[]) {
        super(msg);

        this.errors = errors;
    }

    public toString(): string {
        const str = super.toString();

        if (!this.errors.length) {
            return str;
        }

        return [str, ...this.errors].join('\n');
    }
}
