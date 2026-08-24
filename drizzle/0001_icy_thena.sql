CREATE TABLE `experimentRuns` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`label` varchar(120) NOT NULL,
	`seed` int NOT NULL,
	`trackerMode` enum('classical','predictive','benchmark') NOT NULL,
	`configuration` json NOT NULL,
	`results` json NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `experimentRuns_id` PRIMARY KEY(`id`)
);
