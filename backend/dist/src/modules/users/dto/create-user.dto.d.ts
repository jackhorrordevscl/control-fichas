export declare enum Role {
    ADMIN = "ADMIN",
    THERAPIST = "THERAPIST"
}
export declare class CreateUserDto {
    email: string;
    password: string;
    name: string;
    role?: Role;
}
