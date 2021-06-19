create table if not exists BotUsers (
    id          bigint          primary key,
    username    varchar(255)    not null,
    "name"      varchar(255)    not null,
    surname     varchar(255)    not null,

    created_at  timestamp       default now()
);