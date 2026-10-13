package com.skillbridge.skills;

import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

// Known technical skills and their aliases.
// Used to normalise skill names typed by users and to find skills in résumé text.
@Component
public class SkillCatalog {

    private static final int MAX_SKILL_LENGTH = 60;

    // Aliases too ambiguous to look for in free text (still normalised when typed)
    // ("rest", "spring", "excel"... are ordinary English words in a résumé)
    private static final Set<String> NOT_EXTRACTABLE = Set.of(
            "go", "r", "c", "rest", "spring", "node", "excel",
            "rails", "oracle", "spark", "mongo");

    // canonical name -> aliases (canonical name is always an alias of itself)
    private static final Map<String, List<String>> SKILLS = new LinkedHashMap<>();

    static {
        // Languages
        add("Java", "core java", "java 8", "java 11", "java 17", "java 21");
        add("Python", "python3", "python 3");
        add("JavaScript", "js", "ecmascript", "es6");
        add("TypeScript", "ts");
        add("C", "c programming", "c language");
        add("C++", "cpp", "c plus plus");
        add("C#", "c sharp", "csharp");
        add("Go", "golang");
        add("Rust");
        add("Kotlin");
        add("Swift");
        add("PHP");
        add("Ruby");
        add("Scala");
        add("R", "r programming", "r language");
        add("MATLAB");
        add("Dart");
        add("Bash", "shell scripting", "shell script");
        add("SQL", "structured query language");

        // Frontend
        add("HTML", "html5");
        add("CSS", "css3");
        add("React", "react.js", "reactjs", "react js");
        add("Angular", "angularjs", "angular.js");
        add("Vue.js", "vue", "vuejs", "vue js");
        add("Next.js", "nextjs", "next js");
        add("Redux");
        add("Tailwind CSS", "tailwind", "tailwindcss");
        add("Bootstrap");
        add("jQuery");
        add("Sass", "scss");

        // Backend
        add("Node.js", "nodejs", "node js", "node");
        add("Express.js", "express.js", "expressjs");
        add("Spring Boot", "springboot", "spring framework", "spring mvc", "spring");
        add("Spring Security");
        add("Hibernate");
        add("JPA", "spring data jpa");
        add("Django");
        add("Flask");
        add("FastAPI", "fast api");
        add("ASP.NET", "asp.net core");
        add(".NET", "dotnet", ".net core");
        add("Laravel");
        add("Ruby on Rails", "rails");
        add("REST APIs", "rest api", "restful api", "restful apis", "rest");
        add("GraphQL");
        add("Microservices", "microservice");

        // Databases
        add("MySQL");
        add("PostgreSQL", "postgres");
        add("MongoDB", "mongo");
        add("Redis");
        add("Oracle Database", "oracle db", "oracle");
        add("SQLite");
        add("Firebase");
        add("Elasticsearch");
        add("DynamoDB");

        // Cloud & DevOps
        add("AWS", "amazon web services");
        add("Azure", "microsoft azure");
        add("Google Cloud", "gcp", "google cloud platform");
        add("Docker");
        add("Kubernetes", "k8s");
        add("Jenkins");
        add("CI/CD", "ci cd", "continuous integration");
        add("Terraform");
        add("Linux", "ubuntu");
        add("Git", "version control");
        add("GitHub");
        add("GitHub Actions");
        add("Nginx");

        // Data & AI
        add("Machine Learning", "ml");
        add("Deep Learning");
        add("Artificial Intelligence", "ai");
        add("Natural Language Processing", "nlp");
        add("Computer Vision", "opencv");
        add("Data Analysis", "data analytics");
        add("Data Science");
        add("Pandas");
        add("NumPy");
        add("scikit-learn", "sklearn", "scikit learn");
        add("TensorFlow");
        add("PyTorch");
        add("Keras");
        add("Power BI", "powerbi");
        add("Tableau");
        add("Excel", "microsoft excel", "ms excel");
        add("Statistics");
        add("Apache Spark", "pyspark", "spark");
        add("Hadoop");
        add("Large Language Models", "llm", "llms");

        // Mobile
        add("Android");
        add("iOS");
        add("Flutter");
        add("React Native");

        // Testing & practices
        add("JUnit");
        add("Selenium");
        add("Jest");
        add("Unit Testing");
        add("Agile");
        add("Scrum");
        add("Data Structures", "dsa", "data structures and algorithms");
        add("Algorithms");
        add("Object-Oriented Programming", "oop", "oops", "object oriented programming");
        add("System Design");

        // Design & tools
        add("Figma");
        add("UI/UX", "ui ux", "ux design", "ui design");
        add("Postman");
        add("Jira");
        add("Maven");
        add("Gradle");
        add("Kafka", "apache kafka");
        add("RabbitMQ");
    }

    private static void add(String canonical, String... aliases) {
        List<String> all = new ArrayList<>();
        all.add(canonical);
        all.addAll(List.of(aliases));
        SKILLS.put(canonical, all);
    }

    private final Map<String, String> aliasToCanonical = new LinkedHashMap<>();
    private final List<AliasPattern> patterns = new ArrayList<>();

    private record AliasPattern(String canonical, Pattern pattern) {
    }

    public SkillCatalog() {

        SKILLS.forEach((canonical, aliases) -> {
            for (String alias : aliases) {

                String key = normalizeKey(alias);
                aliasToCanonical.putIfAbsent(key, canonical);

                if (!NOT_EXTRACTABLE.contains(key)) {
                    patterns.add(new AliasPattern(canonical, compile(alias)));
                }
            }
        });
    }

    // Matches the alias as a whole token: "Java" must not match "JavaScript",
    // "SQL" must not match "MySQL", "C" must not match "C++".
    private static Pattern compile(String alias) {

        String[] words = alias.trim().split("\\s+");
        List<String> quoted = new ArrayList<>();

        for (String word : words) {
            quoted.add(Pattern.quote(word));
        }

        String body = String.join("\\s+", quoted);

        return Pattern.compile(
                "(?<![\\p{L}\\p{N}+#.])" + body + "(?![\\p{L}\\p{N}+#])",
                Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE);
    }

    static String normalizeKey(String value) {
        return value.trim()
                .replaceAll("\\s+", " ")
                .toLowerCase(Locale.ROOT);
    }

    // Canonical display name for a skill, or the cleaned input if unknown.
    public String canonicalize(String raw) {

        if (raw == null) {
            return null;
        }

        String cleaned = raw.trim().replaceAll("\\s+", " ");

        if (cleaned.isEmpty()) {
            return null;
        }

        String known = aliasToCanonical.get(normalizeKey(cleaned));

        if (known != null) {
            return known;
        }

        return cleaned.length() > MAX_SKILL_LENGTH
                ? cleaned.substring(0, MAX_SKILL_LENGTH)
                : cleaned;
    }

    // Comparison key: two skills match when their keys are equal.
    public String key(String skill) {
        String canonical = canonicalize(skill);
        return canonical == null ? null : normalizeKey(canonical);
    }

    public boolean isKnown(String skill) {
        return skill != null && aliasToCanonical.containsKey(normalizeKey(skill));
    }

    // Normalises and de-duplicates a list of skills, keeping order.
    public Set<String> canonicalizeAll(Collection<String> rawSkills) {

        Map<String, String> byKey = new LinkedHashMap<>();

        if (rawSkills != null) {
            for (String raw : rawSkills) {
                String canonical = canonicalize(raw);
                if (canonical != null) {
                    byKey.putIfAbsent(normalizeKey(canonical), canonical);
                }
            }
        }

        return new LinkedHashSet<>(byKey.values());
    }

    // Parses "Java, Spring Boot; React" style input.
    public Set<String> parseList(String value) {

        if (value == null || value.isBlank()) {
            return new LinkedHashSet<>();
        }

        return canonicalizeAll(List.of(value.split("[,;|\\n]")));
    }

    // Finds known skills in free text, ordered by first appearance.
    // A skill found only inside a longer skill ("GitHub" in "GitHub Actions") is ignored.
    public Set<String> extractFromText(String text) {

        if (text == null || text.isBlank()) {
            return new LinkedHashSet<>();
        }

        record Hit(String canonical, int start, int end) {
        }

        List<Hit> hits = new ArrayList<>();

        for (AliasPattern aliasPattern : patterns) {
            Matcher matcher = aliasPattern.pattern().matcher(text);
            while (matcher.find()) {
                hits.add(new Hit(aliasPattern.canonical(), matcher.start(), matcher.end()));
            }
        }

        Map<String, Integer> firstSeen = new LinkedHashMap<>();

        for (Hit hit : hits) {

            boolean insideLongerSkill = hits.stream().anyMatch(other ->
                    !other.canonical().equals(hit.canonical())
                            && other.start() <= hit.start()
                            && other.end() >= hit.end()
                            && (other.end() - other.start()) > (hit.end() - hit.start()));

            if (!insideLongerSkill) {
                firstSeen.merge(hit.canonical(), hit.start(), Math::min);
            }
        }

        List<Map.Entry<String, Integer>> entries =
                new ArrayList<>(firstSeen.entrySet());
        entries.sort(Map.Entry.comparingByValue(Comparator.naturalOrder()));

        Set<String> result = new LinkedHashSet<>();
        entries.forEach(entry -> result.add(entry.getKey()));

        return result;
    }
}
